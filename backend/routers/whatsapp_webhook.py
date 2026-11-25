"""Meta WhatsApp Cloud webhook + outbound send routes.

- GET  /api/whatsapp/webhook — Meta verification handshake.
- POST /api/whatsapp/webhook — Receives inbound messages, auto-creates a Lead if
        unknown, optionally auto-replies with DeepSeek.
- POST /api/whatsapp/send-external/{lead_id} — Sends a real message via Meta
        Cloud API, also writes to local DB so it appears in the UI.
"""
import json
import logging
import os
import re
import shutil
import time
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, List, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Request, Response, BackgroundTasks, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Lead, WhatsappMessage, User, AiAgentConfig, WhatsAppAccount, Company, Quotation
from deps import get_current_user
from services import whatsapp_cloud, llm, pdf_generator, alert_service

logger = logging.getLogger("facets.whatsapp")
router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


class SendIn(BaseModel):
    text: str


class InteractiveButtonIn(BaseModel):
    id: str
    title: str  # max 20 chars per Meta WhatsApp API


class SendInteractiveIn(BaseModel):
    body: str  # max 1024 chars
    buttons: List[InteractiveButtonIn]  # 1 to 3 buttons
    header: Optional[str] = None       # max 60 chars
    footer: Optional[str] = None       # max 60 chars


class ListRowIn(BaseModel):
    id: str
    title: str  # max 24 chars per Meta
    description: Optional[str] = None  # max 72 chars per Meta


class ListSectionIn(BaseModel):
    title: str  # max 24 chars
    rows: List[ListRowIn]


class SendListIn(BaseModel):
    body: str  # max 1024 chars
    button_text: str  # max 20 chars (e.g. "View Services", "Select Option")
    sections: List[ListSectionIn]
    header: Optional[str] = None
    footer: Optional[str] = None


class SendCtaUrlIn(BaseModel):
    body: str  # max 1024 chars
    display_text: str  # max 20 chars per Meta WhatsApp API
    url: str  # HTTP/HTTPS URL
    header: Optional[str] = None  # max 60 chars
    footer: Optional[str] = None  # max 60 chars


class SendMediaIn(BaseModel):
    media_type: str  # document | image
    media_url: str
    filename: Optional[str] = None
    caption: Optional[str] = None


def _auto_reply_enabled() -> bool:
    return os.environ.get("AUTOMATION_AUTO_REPLY", "false").lower() == "true"


def _extract_wamid(sent: Any) -> Optional[str]:
    if isinstance(sent, dict):
        msgs = sent.get("messages") or []
        if msgs and isinstance(msgs[0], dict):
            return msgs[0].get("id")
    return None


@router.get("/webhook")
def verify(hub_mode: Optional[str] = None,
           hub_challenge: Optional[str] = None,
           hub_verify_token: Optional[str] = None,
           request: Request = None):
    # FastAPI Query aliases for the literal "hub.*" names
    q = dict(request.query_params) if request else {}
    mode = q.get("hub.mode") or hub_mode
    token = q.get("hub.verify_token") or hub_verify_token
    challenge = q.get("hub.challenge") or hub_challenge
    expected = whatsapp_cloud.verify_token()
    if mode == "subscribe" and token == expected and challenge:
        return Response(content=str(challenge), media_type="text/plain", status_code=200)
    return Response(status_code=403)


@router.post("/webhook")
async def receive(request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    try:
        payload = await request.json()
    except Exception:
        payload = {}
    logger.info("WA Webhook received: %s", payload)

    # Process delivery receipts (sent / delivered / read / failed) for broadcasts
    try:
        from models import WhatsAppBroadcastRecipient, WhatsAppBroadcast
        for entry in (payload.get("entry") or []):
            for change in (entry.get("changes") or []):
                val = change.get("value") or {}
                # Handle Meta template approval status update webhook
                field_name = change.get("field")
                if field_name == "message_template_status_update":
                    from models import MetaTemplateRecord
                    event_status = val.get("event")  # APPROVED, REJECTED, PAUSED, PENDING
                    tmpl_name = val.get("message_template_name")
                    tmpl_id = str(val.get("message_template_id") or "")
                    reason = val.get("reason")
                    if tmpl_name:
                        t_rec = db.query(MetaTemplateRecord).filter(MetaTemplateRecord.name == tmpl_name).first()
                        if t_rec:
                            t_rec.status = event_status.upper() if event_status else "APPROVED"
                            if tmpl_id:
                                t_rec.meta_id = tmpl_id
                            if reason:
                                t_rec.rejection_reason = str(reason)[:500]
                            db.commit()
                            logger.info("Updated Meta template %s status to %s via Webhook", tmpl_name, t_rec.status)

                for st in (val.get("statuses") or []):
                    wamid = st.get("id")
                    status_name = st.get("status")  # sent, delivered, read, failed
                    pricing_cat = (st.get("pricing") or {}).get("category")
                    if wamid and status_name:
                        # 1. Update individual 1-on-1 / Drip / Bot WhatsappMessage receipt
                        w_msg = db.query(WhatsappMessage).filter(WhatsappMessage.wa_message_id == wamid).first()
                        if w_msg:
                            w_msg.status = status_name
                            if pricing_cat:
                                w_msg.cost_category = pricing_cat.upper()
                            db.commit()

                        # 2. Update Broadcast Recipient receipt
                        rec = db.query(WhatsAppBroadcastRecipient).filter(WhatsAppBroadcastRecipient.wa_message_id == wamid).first()
                        if rec:
                            now = datetime.now(timezone.utc)
                            if status_name == "delivered":
                                rec.status = "delivered"
                                rec.delivered_at = now
                                if rec.broadcast:
                                    rec.broadcast.delivered_count = (rec.broadcast.delivered_count or 0) + 1
                            elif status_name == "read":
                                rec.status = "read"
                                rec.read_at = now
                                if rec.broadcast:
                                    rec.broadcast.read_count = (rec.broadcast.read_count or 0) + 1
                            elif status_name == "failed":
                                rec.status = "failed"
                                err_list = st.get("errors") or [{}]
                                err_code = err_list[0].get("code")
                                err_detail = err_list[0].get("error_data", {}).get("details") or err_list[0].get("message") or "Delivery failed"
                                if err_code == 131047:
                                    rec.error_message = "Outside 24h window (Customer must initiate or template required)"
                                else:
                                    rec.error_message = str(err_detail)[:255]
                                if rec.broadcast:
                                    rec.broadcast.failed_count = (rec.broadcast.failed_count or 0) + 1
                            db.commit()
    except Exception as e:
        logger.warning("Error updating broadcast delivery receipts: %s", e)

    items = whatsapp_cloud.parse_inbound(payload)
    if not items:
        return {"ok": True, "received": 0}

    for it in items:
        phone = it["from_number"]
        phone_number_id = it.get("phone_number_id")

        # Determine target company
        company_id = "6186bed7-71bb-4532-abb9-b83542ae8530" # Default ParshWebCraft company
        if phone_number_id:
            wa_acc = db.query(WhatsAppAccount).filter(WhatsAppAccount.phone_number_id == str(phone_number_id)).first()
            if wa_acc and wa_acc.company_id:
                company_id = wa_acc.company_id

        # Find or create lead by phone fragment (last 10 digits match within this company)
        last10 = (phone or "")[-10:]
        lead = (db.query(Lead)
                  .filter(Lead.company_id == company_id, Lead.phone.like(f"%{last10}"))
                  .order_by(Lead.created_at.desc())
                  .first()) if last10 else None
        if lead is None:
            lead = Lead(
                company_id=company_id,
                name=(it.get("name") or f"WhatsApp +{phone}")[:160],
                phone=f"+{phone}" if not str(phone).startswith("+") else phone,
                source="WhatsApp", status="New",
                customer_type="Prospect",
                notes="Auto-created from WhatsApp Cloud API webhook.",
            )
            db.add(lead)
            db.commit()
            db.refresh(lead)
            logger.info("Auto-created lead %s for inbound WhatsApp %s (company: %s)", lead.id, phone, company_id)
        elif not lead.company_id:
            lead.company_id = company_id
            db.commit()

        # Inbound Media Processing Engine (Voice Notes, Images, Documents, Videos)
        inbound_text = it["message"]
        media_url_val = None
        media_type_val = it.get("media_type")

        if media_type_val == "image" and it.get("media_id"):
            try:
                logger.info("Inbound WhatsApp image detected for lead %s (media_id: %s)", lead.id, it["media_id"])
                img_bytes, mime_type = whatsapp_cloud.download_media_bytes(
                    it["media_id"], company_id=lead.company_id
                )
                if img_bytes:
                    uploads_dir = Path(__file__).resolve().parent.parent / "uploads" / "whatsapp"
                    uploads_dir.mkdir(parents=True, exist_ok=True)
                    ext = "png" if "png" in (mime_type or "") else "jpg"
                    img_filename = f"img_{lead.id}_{it['media_id']}.{ext}"
                    file_path = uploads_dir / img_filename
                    with open(file_path, "wb") as f_img:
                        f_img.write(img_bytes)

                    media_url_val = f"/uploads/whatsapp/{img_filename}"
                    caption = it.get("media_caption")
                    inbound_text = f"🖼️ {caption}" if caption else "[Image]"
            except Exception as e_img:
                logger.error("Failed to download inbound WhatsApp image: %s", e_img)

        elif media_type_val == "audio" and it.get("media_id"):
            try:
                from services import whisper_stt
                logger.info("Inbound WhatsApp voice note detected for lead %s (media_id: %s)", lead.id, it["media_id"])
                audio_bytes, mime_type = whatsapp_cloud.download_media_bytes(
                    it["media_id"], company_id=lead.company_id
                )
                if audio_bytes:
                    uploads_dir = Path(__file__).resolve().parent.parent / "uploads" / "whatsapp"
                    uploads_dir.mkdir(parents=True, exist_ok=True)
                    audio_filename = f"voice_{lead.id}_{int(time.time())}.ogg"
                    file_path = uploads_dir / audio_filename
                    with open(file_path, "wb") as f_aud:
                        f_aud.write(audio_bytes)

                    media_url_val = f"/uploads/whatsapp/{audio_filename}"

                    transcript = whisper_stt.transcribe_audio_bytes(
                        audio_bytes,
                        filename=audio_filename,
                        mimetype=mime_type or "audio/ogg",
                    )
                    if transcript and transcript.strip():
                        inbound_text = f"🎙️ [Voice Note]: \"{transcript.strip()}\""
                        logger.info("Transcribed voice note for lead %s: '%s'", lead.id, transcript[:120])
                    else:
                        inbound_text = "🎙️ [Voice Note: Audio message received]"
            except Exception as e_voice:
                logger.error("Failed to process inbound WhatsApp voice note: %s", e_voice)
                inbound_text = "🎙️ [Voice Note: Audio received]"

        elif media_type_val == "document" and it.get("media_id"):
            try:
                doc_bytes, mime_type = whatsapp_cloud.download_media_bytes(
                    it["media_id"], company_id=lead.company_id
                )
                if doc_bytes:
                    uploads_dir = Path(__file__).resolve().parent.parent / "uploads" / "whatsapp"
                    uploads_dir.mkdir(parents=True, exist_ok=True)
                    orig_name = it.get("media_filename") or f"doc_{lead.id}_{it['media_id']}.pdf"
                    file_path = uploads_dir / orig_name
                    with open(file_path, "wb") as f_doc:
                        f_doc.write(doc_bytes)
                    media_url_val = f"/uploads/whatsapp/{orig_name}"
            except Exception as e_doc:
                logger.error("Failed to download inbound WhatsApp document: %s", e_doc)

        elif media_type_val == "video" and it.get("media_id"):
            try:
                logger.info("Inbound WhatsApp video detected for lead %s (media_id: %s)", lead.id, it["media_id"])
                vid_bytes, mime_type = whatsapp_cloud.download_media_bytes(
                    it["media_id"], company_id=lead.company_id
                )
                if vid_bytes:
                    uploads_dir = Path(__file__).resolve().parent.parent / "uploads" / "whatsapp"
                    uploads_dir.mkdir(parents=True, exist_ok=True)
                    ext = "mp4"
                    vid_filename = f"vid_{lead.id}_{it['media_id']}.{ext}"
                    file_path = uploads_dir / vid_filename
                    with open(file_path, "wb") as f_vid:
                        f_vid.write(vid_bytes)

                    media_url_val = f"/uploads/whatsapp/{vid_filename}"
                    caption = it.get("media_caption")
                    inbound_text = f"🎥 {caption}" if caption else "[Video]"
            except Exception as e_vid:
                logger.error("Failed to download inbound WhatsApp video: %s", e_vid)

        # Persist inbound
        button_id = it.get("button_id")
        button_title = it.get("button_title")
        interactive_type = it.get("interactive_type")
        buttons_json_val = None
        if button_id:
            buttons_json_val = json.dumps({"selected_id": button_id, "selected_title": button_title})

        w_msg = WhatsappMessage(
            lead_id=lead.id,
            company_id=lead.company_id,
            direction="in",
            message=inbound_text,
            media_type=media_type_val,
            media_url=media_url_val,
            media_filename=it.get("media_filename") or (f"voice_{lead.id}.ogg" if media_type_val == "audio" else None),
            media_caption=it.get("media_caption"),
            buttons_json=buttons_json_val,
            interactive_type=interactive_type,
        )
        db.add(w_msg)
        lead.last_customer_message_at = datetime.now(timezone.utc)
        if getattr(lead, "drip_status", None) == "active":
            lead.drip_status = "stopped"

        # Attribute reply to recent broadcast if applicable
        try:
            from models import WhatsAppBroadcastRecipient
            recent_rec = (
                db.query(WhatsAppBroadcastRecipient)
                .filter(WhatsAppBroadcastRecipient.lead_id == lead.id)
                .order_by(WhatsAppBroadcastRecipient.id.desc())
                .first()
            )
            if recent_rec and recent_rec.status in ("sent", "delivered", "read"):
                recent_rec.status = "replied"
                recent_rec.replied_at = datetime.now(timezone.utc)
                if recent_rec.broadcast:
                    recent_rec.broadcast.replied_count = (recent_rec.broadcast.replied_count or 0) + 1
        except Exception as e_rep:
            logger.warning("Could not attribute reply to broadcast: %s", e_rep)

        db.commit()
        db.refresh(w_msg)


        # Mark as read on WhatsApp to trigger Blue Double Ticks
        if it.get("wa_message_id"):
            try:
                whatsapp_cloud.mark_read(it["wa_message_id"], phone_id=it.get("phone_number_id"), company_id=company_id)
            except Exception as e:
                logger.warning("Could not mark message %s as read: %s", it.get("wa_message_id"), e)

        try:
            from services.automation_engine import trigger_automation
            trigger_automation(db, "whatsapp_inbound", w_msg.id)
        except Exception as e:
            logger.error("Failed to trigger whatsapp_inbound automation: %s", e)

        # 0. Handle Interactive Button Clicks if customer tapped a quick reply button
        if button_id:
            btn_id_lower = (button_id or "").lower()
            btn_title_lower = (button_title or "").lower()

            # A. Customer tapped "Talk to Human"
            if btn_id_lower in ("btn_human", "btn_talk_human", "btn_agent") or "human" in btn_id_lower or "human" in btn_title_lower:
                lead.ai_bot_paused = True
                lead.ai_bot_handover_reason = "customer selected Talk to Human via button"
                lead.status = "Needs human"

                note_msg = WhatsappMessage(
                    lead_id=lead.id,
                    company_id=lead.company_id,
                    direction="note",
                    message="[INTERNAL NOTE] Customer selected [Talk to Human] button. Bot paused; human handover triggered."
                )
                db.add(note_msg)

                handover_text = f"Thanks for choosing to speak with us, {lead.name}! I have notified our senior specialists. A human team member will assist you right away."
                try:
                    if whatsapp_cloud.is_configured():
                        whatsapp_cloud.send_text(phone, handover_text, company_id=lead.company_id)
                except Exception as e:
                    logger.warning("Cloud send handover message failed: %s", e)

                db.add(WhatsappMessage(
                    lead_id=lead.id,
                    company_id=lead.company_id,
                    direction="out",
                    message=f"[AI AUTO] {handover_text}"
                ))
                db.commit()

                try:
                    alert_service.dispatch_dual_alert(
                        event_type="handover_requested",
                        lead=lead,
                        details={"notes": f"Customer tapped button: '{button_title}'"},
                        db=db,
                        company_id=lead.company_id,
                    )
                except Exception as e:
                    logger.warning("Could not dispatch handover dual alert: %s", e)
                continue

            # B. Customer tapped "Book a Call"
            if btn_id_lower in ("btn_call", "btn_book_call", "btn_schedule", "btn_discovery_call") or "call" in btn_id_lower or "call" in btn_title_lower:
                if lead.status in ("New", "Contacted", None, "Active"):
                    lead.status = "Qualified"
                call_ack = (
                    f"Awesome, {lead.name}! We'd love to connect for a 15-minute discovery call.\n\n"
                    f"What time slot works best for you today or tomorrow? Or let us know your preferred time and our team will confirm."
                )
                try:
                    if whatsapp_cloud.is_configured():
                        whatsapp_cloud.send_text(phone, call_ack, company_id=lead.company_id)
                except Exception as e:
                    logger.warning("Failed to send call ack: %s", e)

                db.add(WhatsappMessage(
                    lead_id=lead.id,
                    company_id=lead.company_id,
                    direction="out",
                    message=f"[AI AUTO] {call_ack}"
                ))
                db.commit()

                try:
                    alert_service.dispatch_dual_alert(
                        event_type="discovery_call",
                        lead=lead,
                        details={"notes": "Customer tapped 'Book a Call' CTA in WhatsApp conversation"},
                        db=db,
                        company_id=lead.company_id,
                    )
                except Exception as e:
                    logger.warning("Could not dispatch discovery call dual alert: %s", e)
                continue

            # C. Customer tapped "View Packages" / "Services Overview"
            if btn_id_lower in ("btn_pricing", "btn_packages", "btn_view_packages") or "package" in btn_id_lower or "package" in btn_title_lower:
                lead.status = "Proposal Requested"
                db.commit()

                pkg_ack = (
                    f"Thank you for your interest, {lead.name}! 📑\n\n"
                    f"Our web engineering and digital solutions are customized based on your specific requirements and deliverables to ensure maximum ROI for your business.\n\n"
                    f"Our team will connect with you directly to share a tailored proposal. Would you like to review our agency overview or hop on a quick 15-minute discovery call?"
                )
                pkg_buttons = [
                    {"id": "btn_brochure", "title": "📑 Agency Profile PDF"},
                    {"id": "btn_call", "title": "📅 Book Quick Call"},
                    {"id": "btn_human", "title": "👤 Talk to Human"},
                ]
                sent_ok = False
                try:
                    if whatsapp_cloud.is_configured():
                        whatsapp_cloud.send_quick_reply_buttons(
                            to=phone,
                            body=pkg_ack,
                            buttons=pkg_buttons,
                            footer="ParshWebCraft Solutions",
                            company_id=lead.company_id,
                        )
                        sent_ok = True
                except Exception as e:
                    logger.warning("Sending buttons for packages failed, fallback to text: %s", e)
                    try:
                        whatsapp_cloud.send_text(phone, pkg_ack, company_id=lead.company_id)
                        sent_ok = True
                    except Exception:
                        pass

                db.add(WhatsappMessage(
                    lead_id=lead.id,
                    company_id=lead.company_id,
                    direction="out",
                    message=f"[AI AUTO] {pkg_ack}",
                    buttons_json=json.dumps(pkg_buttons) if sent_ok else None,
                    interactive_type="button" if sent_ok else None,
                ))
                db.commit()

                agent_cfg = db.query(AiAgentConfig).filter(AiAgentConfig.company_id == lead.company_id).first()
                is_pwc = lead.company_id in ("parshwebcraft-default", "6186bed7-71bb-4532-abb9-b83542ae8530")
                founder_num = (agent_cfg.founder_phone if (agent_cfg and agent_cfg.founder_phone) else ("919521347419" if is_pwc else None))
                alert_text = (
                    f"📦 [Packages / Services Viewed] Lead Tapped CTA!\n"
                    f"👤 Lead: {lead.name} ({lead.phone})\n"
                    f"🔗 CRM: https://parshagent.com/whatsapp"
                )
                try:
                    clean_phone = whatsapp_cloud._normalize(phone)
                    clean_founder = whatsapp_cloud._normalize(founder_num)
                    if clean_founder and clean_founder != clean_phone:
                        background_tasks.add_task(whatsapp_cloud.send_text, founder_num, alert_text)
                except Exception as e:
                    logger.warning("Could not schedule founder alert: %s", e)
                continue

            # D. Customer tapped "Get Proposal" / "Quotation"
            if btn_id_lower in ("btn_proposal", "btn_quote", "btn_get_proposal") or "proposal" in btn_id_lower or "quote" in btn_title_lower:
                lead.status = "Proposal Requested"
                db.commit()

                proposal_ack = (
                    f"Thanks for requesting a proposal, {lead.name}! 📑\n\n"
                    f"Our technical team is compiling the custom scope and deliverables for your project. We will connect with you and share the official tailored proposal shortly.\n\n"
                    f"Would you like to schedule a 15-minute discovery call to discuss your exact requirements?"
                )
                proposal_buttons = [
                    {"id": "btn_call", "title": "📅 Book a Call"},
                    {"id": "btn_human", "title": "👤 Talk to Human"},
                ]
                sent_ok = False
                try:
                    if whatsapp_cloud.is_configured():
                        whatsapp_cloud.send_quick_reply_buttons(
                            to=phone,
                            body=proposal_ack,
                            buttons=proposal_buttons,
                            footer="ParshWebCraft Solutions",
                            company_id=lead.company_id,
                        )
                        sent_ok = True
                except Exception as e:
                    logger.warning("Buttons send failed for proposal ack, fallback to text: %s", e)
                    try:
                        whatsapp_cloud.send_text(phone, proposal_ack, company_id=lead.company_id)
                        sent_ok = True
                    except Exception:
                        pass

                db.add(WhatsappMessage(
                    lead_id=lead.id,
                    company_id=lead.company_id,
                    direction="out",
                    message=f"[AI AUTO] {proposal_ack}",
                    buttons_json=json.dumps(proposal_buttons) if sent_ok else None,
                    interactive_type="button" if sent_ok else None,
                ))
                db.commit()

                try:
                    alert_service.dispatch_dual_alert(
                        event_type="proposal_requested",
                        lead=lead,
                        details={"notes": "Customer tapped 'Get Proposal' CTA in WhatsApp conversation"},
                        db=db,
                        company_id=lead.company_id,
                    )
                except Exception as e:
                    logger.warning("Could not dispatch proposal dual alert: %s", e)
                continue

            # D. Customer tapped "Brochure" / "Services"
            if btn_id_lower in ("btn_brochure", "btn_agency_profile", "btn_services", "btn_portfolio") or "brochure" in btn_id_lower or "brochure" in btn_title_lower:
                try:
                    pdf_generator.generate_agency_brochure_pdf()
                    public_base = os.environ.get("PUBLIC_BASE_URL", "https://api.parshagent.com").rstrip("/")
                    b_url = f"{public_base}/uploads/brochures/ParshWebCraft_Services_Overview.pdf"
                    b_caption = "Here is our official agency profile & services catalog from ParshWebCraft."
                    if whatsapp_cloud.is_configured():
                        whatsapp_cloud.send_document(
                            to=phone,
                            document_url=b_url,
                            filename="ParshWebCraft_Services_Overview.pdf",
                            caption=b_caption,
                            company_id=lead.company_id,
                        )
                    db.add(WhatsappMessage(
                        lead_id=lead.id,
                        company_id=lead.company_id,
                        direction="out",
                        message=f"[AI AUTO] [DOCUMENT] ParshWebCraft_Services_Overview.pdf - {b_caption}",
                        media_type="document",
                        media_url=b_url,
                        media_filename="ParshWebCraft_Services_Overview.pdf",
                        media_caption=b_caption,
                    ))
                    db.commit()
                    logger.info("Auto-delivered brochure PDF to %s upon button click", phone)
                except Exception as e:
                    logger.warning("Failed to auto-send brochure PDF on button click: %s", e)
                continue

            # E. Customer tapped "Accept Quote"
            if btn_id_lower in ("btn_accept", "btn_accept_quote") or "accept" in btn_id_lower or "accept" in btn_title_lower:
                lead.status = "Won"
                db.commit()
                accept_ack = (
                    f"🎉 Fantastic, {lead.name}! Thank you for approving the proposal.\n\n"
                    f"We are excited to partner with you. Our project onboarding team is spinning up your kickoff environment and will reach out with the next steps shortly!"
                )
                try:
                    if whatsapp_cloud.is_configured():
                        whatsapp_cloud.send_text(phone, accept_ack, company_id=lead.company_id)
                except Exception as e:
                    logger.warning("Failed to send accept ack: %s", e)
                db.add(WhatsappMessage(
                    lead_id=lead.id,
                    company_id=lead.company_id,
                    direction="out",
                    message=f"[AI AUTO] {accept_ack}"
                ))
                db.commit()

                agent_cfg = db.query(AiAgentConfig).filter(AiAgentConfig.company_id == lead.company_id).first()
                is_pwc = lead.company_id in ("parshwebcraft-default", "6186bed7-71bb-4532-abb9-b83542ae8530")
                founder_num = (agent_cfg.founder_phone if (agent_cfg and agent_cfg.founder_phone) else ("919521347419" if is_pwc else None))
                alert_text = (
                    f"🚀 [DEAL WON / QUOTE ACCEPTED] WhatsApp CTA!\n"
                    f"👤 Lead: {lead.name} ({lead.phone})\n"
                    f"🎉 Lead tapped 'Accept Quote'!\n"
                    f"🔗 CRM: https://parshagent.com/whatsapp"
                )
                try:
                    clean_phone = whatsapp_cloud._normalize(phone)
                    clean_founder = whatsapp_cloud._normalize(founder_num)
                    if clean_founder and clean_founder != clean_phone:
                        background_tasks.add_task(whatsapp_cloud.send_text, founder_num, alert_text)
                except Exception as e:
                    logger.warning("Could not schedule founder alert: %s", e)
                continue

            # F. Customer selected an Item from Interactive List Menu (list_reply)
            if interactive_type == "list_reply" or btn_id_lower.startswith("item_"):
                selected_service = button_title or "Selected Service"
                service_details = ""
                if "starter" in btn_id_lower or "starter" in btn_title_lower:
                    service_details = "Our Starter Website Package delivers a 5-page high-speed responsive website, modern design, contact forms, and WhatsApp integration in 4-7 days."
                elif "corporate" in btn_id_lower or "portal" in btn_id_lower:
                    service_details = "Our Business / Corporate Portal Package includes bespoke branding, SEO architecture, dynamic CMS blog, and lead capture workflows delivered in 10-14 days."
                elif "ecommerce" in btn_id_lower or "e-commerce" in btn_title_lower or "store" in btn_title_lower:
                    service_details = "Our E-Commerce Store Package includes Shopify or custom MERN stack, Razorpay/Stripe checkout, product inventory, and automated cart recovery."
                elif "whatsapp" in btn_id_lower or "bot" in btn_id_lower:
                    service_details = "Our WhatsApp AI Sales Suite provides 24/7 autonomous lead qualification, interactive menus, PDF quote dispatch, and appointment scheduling via Meta Cloud API."
                elif "voice" in btn_id_lower or "caller" in btn_title_lower or "calling" in btn_title_lower:
                    service_details = "Our AI Voice Calling Specialist conducts human-grade inbound customer answering and outbound qualification calls with instant CRM sync."
                elif "saas" in btn_id_lower or "app" in btn_id_lower or "web app" in btn_title_lower:
                    service_details = "Our Custom SaaS & Web Application development includes full-stack Next.js/React + Python/Node, PostgreSQL, role-based auth, and admin dashboards."
                elif "seo" in btn_id_lower or "growth" in btn_id_lower:
                    service_details = "Our SEO & Growth Engine optimizes search rankings, technical site speed, and conversion funnels to drive organic qualified inbound leads."
                else:
                    service_details = f"Our team specializes in enterprise-grade {selected_service} with custom deliverables tailored to your business goals."

                reply_text = (
                    f"Thank you for choosing *{selected_service}*, {lead.name}! 🎯\n\n"
                    f"{service_details}\n\n"
                    f"How would you like to proceed? We can share a tailored proposal or hop on a 15-min discovery call."
                )

                followup_buttons = [
                    {"id": "btn_call", "title": "📅 Book a Call"},
                    {"id": "btn_proposal", "title": "📑 Get Proposal"},
                    {"id": "btn_human", "title": "👤 Talk to Human"},
                ]
                sent_ok = False
                try:
                    if whatsapp_cloud.is_configured():
                        whatsapp_cloud.send_quick_reply_buttons(
                            to=phone,
                            body=reply_text,
                            buttons=followup_buttons,
                            footer="ParshWebCraft Solutions",
                            company_id=lead.company_id,
                        )
                        sent_ok = True
                except Exception as e:
                    logger.warning("Sending buttons for list selection reply failed: %s", e)
                    try:
                        whatsapp_cloud.send_text(phone, reply_text, company_id=lead.company_id)
                        sent_ok = True
                    except Exception:
                        pass

                db.add(WhatsappMessage(
                    lead_id=lead.id,
                    company_id=lead.company_id,
                    direction="out",
                    message=f"[AI AUTO] {reply_text}",
                    buttons_json=json.dumps(followup_buttons) if sent_ok else None,
                    interactive_type="button" if sent_ok else None,
                ))

                # Update lead notes with selected service interest
                lead.notes = f"Interested in: {selected_service} | {lead.notes or ''}"
                if lead.status in ("New", "Contacted", None, "Active"):
                    lead.status = "Proposal Requested"
                db.commit()

                # Notify founder
                agent_cfg = db.query(AiAgentConfig).filter(AiAgentConfig.company_id == lead.company_id).first()
                is_pwc = lead.company_id in ("parshwebcraft-default", "6186bed7-71bb-4532-abb9-b83542ae8530")
                founder_num = (agent_cfg.founder_phone if (agent_cfg and agent_cfg.founder_phone) else ("919521347419" if is_pwc else None))
                alert_text = (
                    f"🎯 [Service Selected from Menu] WhatsApp Interactive!\n"
                    f"👤 Lead: {lead.name} ({lead.phone})\n"
                    f"📋 Choice: {selected_service}\n"
                    f"🔗 CRM: https://parshagent.com/whatsapp"
                )
                try:
                    clean_phone = whatsapp_cloud._normalize(phone)
                    clean_founder = whatsapp_cloud._normalize(founder_num)
                    if clean_founder and clean_founder != clean_phone:
                        background_tasks.add_task(whatsapp_cloud.send_text, founder_num, alert_text)
                except Exception as e:
                    logger.warning("Could not schedule founder alert: %s", e)
                continue

        # 1. Check if AI Bot is paused for this specific lead
        if getattr(lead, "ai_bot_paused", False):
            logger.info("AI bot is paused for lead %s (%s). Skipping auto-reply.", lead.id, lead.name)
            continue

        # 2. Detect if customer asked for a human / agent
        inbound_lower = (inbound_text or "").lower().strip()
        human_keywords = [
            "talk to human", "talk to agent", "connect to human", "connect with human",
            "real person", "human agent", "human please", "insan", "human", "representative",
            "executive", "admin se baat", "kisi se baat", "call me please"
        ]
        asks_human = any(kw in inbound_lower for kw in human_keywords)
        if asks_human:
            lead.ai_bot_paused = True
            lead.ai_bot_handover_reason = "customer asked for a human"
            lead.status = "Needs human"

            # Internal note (not sent to customer)
            note_msg = WhatsappMessage(
                lead_id=lead.id,
                company_id=lead.company_id,
                direction="note",
                message="[INTERNAL NOTE] AI agent handed this chat to your team (customer asked for a human). The bot is paused for this chat; resume it from AI Assist → AI bot."
            )
            db.add(note_msg)

            # Customer acknowledgment
            handover_text = f"Thanks for reaching out, {lead.name}! I have handed this conversation over to our team. A human specialist will respond to you right away."
            try:
                if whatsapp_cloud.is_configured():
                    whatsapp_cloud.send_text(phone, handover_text)
            except Exception as e:
                logger.warning("Cloud send handover message failed: %s", e)

            db.add(WhatsappMessage(
                lead_id=lead.id,
                company_id=lead.company_id,
                direction="out",
                message=f"[AI AUTO] {handover_text}"
            ))
            db.commit()

            # Founder dual alert
            try:
                alert_service.dispatch_dual_alert(
                    event_type="handover_requested",
                    lead=lead,
                    details={"notes": f"Customer asked for human: '{it.get('message')}'"},
                    db=db,
                    company_id=lead.company_id,
                )
            except Exception as e:
                logger.warning("Could not dispatch handover dual alert: %s", e)
            continue

        # 3. Standard Auto-reply with AI Agent (STRICTLY company-scoped, ZERO fallback to other companies)
        agent_cfg = db.query(AiAgentConfig).filter(AiAgentConfig.company_id == lead.company_id).first()
        if not agent_cfg or not agent_cfg.enabled or not agent_cfg.auto_reply_enabled:
            logger.info("AI Auto-reply skipped for company %s (Not configured or auto-reply disabled)", lead.company_id)
            continue

        history = (db.query(WhatsappMessage)
                     .filter(WhatsappMessage.lead_id == lead.id)
                     .order_by(WhatsappMessage.created_at.asc()).all())
        knowledge = agent_cfg.knowledge_chunks if (agent_cfg and agent_cfg.enabled) else None
        try:
            reply = llm.whatsapp_reply(
                {"name": lead.name, "city": lead.city,
                 "customer_type": lead.customer_type, "budget": lead.budget,
                 "status": lead.status},
                [{"direction": m.direction, "message": m.message} for m in history],
                custom_knowledge=knowledge,
            )
        except Exception as e:  # noqa: BLE001
            logger.warning("AI reply failed: %s", e)
            reply = None

        if reply:
            sent_interactive = False

            # Determine company custom buttons
            buttons_enabled = getattr(agent_cfg, "buttons_enabled", False)
            custom_buttons = []
            if buttons_enabled:
                b1 = (getattr(agent_cfg, "button1_title", "") or "").strip()
                b2 = (getattr(agent_cfg, "button2_title", "") or "").strip()
                b3 = (getattr(agent_cfg, "button3_title", "") or "").strip()
                if b1:
                    custom_buttons.append({"id": "btn_1", "title": b1[:20]})
                if b2:
                    custom_buttons.append({"id": "btn_2", "title": b2[:20]})
                if b3:
                    custom_buttons.append({"id": "btn_3", "title": b3[:20]})

                # Fallback default buttons ONLY for ParshWebCraft primary company
                if not custom_buttons and lead.company_id in ("parshwebcraft-default", "6186bed7-71bb-4532-abb9-b83542ae8530"):
                    custom_buttons = [
                        {"id": "btn_call", "title": "📅 Book a Call"},
                        {"id": "btn_proposal", "title": "📑 Get Proposal"},
                        {"id": "btn_human", "title": "👤 Talk to Human"},
                    ]

            # Determine company footer
            show_footer = getattr(agent_cfg, "show_footer", False)
            footer_text = (getattr(agent_cfg, "footer_text", "") or "").strip()
            footer = footer_text[:60] if (show_footer and footer_text) else None

            # Smart Intent Filter for Interactive Buttons (Anti-Spam / Human-First Experience):
            # Strict Rule: NEVER attach buttons to every message.
            # Only attach buttons when customer has explicit commercial/service inquiry,
            # and NEVER on festival wishes, casual pleasantries, greetings, or acknowledgments.
            inbound_clean = (inbound_text or "").lower().strip()

            is_festival_greeting = any(w in inbound_clean for w in [
                "diwali", "deepawali", "deepavali", "happy diwali", "shubh deepawali",
                "same to you", "wishing you", "happy new year", "mubarak", "badhaai", "festive",
                "holi", "eid", "christmas", "congrats", "congratulations"
            ])

            is_casual_pleasantry = any(w in inbound_clean for w in [
                "hi", "hello", "hey", "namaste", "kem cho", "start",
                "kaise ho", "kaisa hai", "kese ho", "sab theek", "sab badhiya", "thanks", "thank you",
                "dhanyawad", "shukriya", "bhaiya", "didi", "bhua", "uncle", "aunty", "bhai",
                "mast", "thik", "theek", "ok", "okk", "okay", "haan", "ha", "achha", "accha",
                "done", "got it", "sure", "alright", "great", "nice"
            ]) and not any(w in inbound_clean for w in [
                "website", "app", "software", "price", "rate", "cost", "quotation", "quote",
                "proposal", "call", "meeting", "charges", "budget", "hire", "service"
            ])

            has_commercial_intent = any(w in inbound_clean for w in [
                "website", "web app", "software", "ecommerce", "e-commerce", "shopify", "wordpress",
                "seo", "digital marketing", "graphic", "logo", "ai bot", "automation", "crm",
                "price", "pricing", "cost", "rate", "rates", "quotation", "quote",
                "proposal", "package", "packages", "charges", "budget", "hire", "service", "services",
                "requirement", "project", "banwana", "banwani", "karna hai", "features",
                "schedule", "meeting", "discuss", "portfolio", "demo", "book call", "brochure", "call me"
            ])

            # Check if AI reply itself explicitly proposes booking a call or requesting a proposal
            reply_lower = (reply or "").lower()
            reply_offers_next_step = any(phrase in reply_lower for phrase in [
                "discovery call", "schedule a call", "book a call", "10-minute call", "15-minute call",
                "tailored proposal", "send you a proposal", "share the proposal", "custom proposal"
            ])

            # Anti-Spam: Do not attach buttons if buttons were already sent in recent turns for this lead
            recent_had_buttons = False
            recent_msgs = history[-4:] if history else []
            for m in recent_msgs:
                if m.direction == "out" and (getattr(m, "buttons_json", None) or getattr(m, "interactive_type", None) == "button"):
                    recent_had_buttons = True
                    break

            # Strictly attach buttons ONLY when intent is commercial and not in a casual/festive exchange
            should_attach_buttons = (
                buttons_enabled
                and bool(custom_buttons)
                and len(reply) <= 950
                and not is_festival_greeting
                and not is_casual_pleasantry
                and (has_commercial_intent or reply_offers_next_step)
                and not recent_had_buttons
            )

            try:
                if whatsapp_cloud.is_configured():
                    if should_attach_buttons:
                        try:
                            whatsapp_cloud.send_quick_reply_buttons(
                                to=phone,
                                body=reply,
                                buttons=custom_buttons,
                                footer=footer,
                                company_id=lead.company_id,
                            )
                            sent_interactive = True
                        except Exception as e_btn:
                            logger.warning("Sending buttons failed, fallback to text: %s", e_btn)
                            whatsapp_cloud.send_text(phone, reply, company_id=lead.company_id)
                    else:
                        # Send pure natural text message with ZERO unwanted buttons
                        whatsapp_cloud.send_text(phone, reply, company_id=lead.company_id)
            except Exception as e:  # noqa: BLE001
                logger.warning("Cloud send failed: %s", e)

            db.add(WhatsappMessage(
                lead_id=lead.id,
                company_id=lead.company_id,
                direction="out",
                message=f"[AI AUTO] {reply}",
                buttons_json=json.dumps(custom_buttons) if sent_interactive else None,
                interactive_type="button" if sent_interactive else None,
            ))
            db.commit()

            # Auto-advance lead status to Proposal Requested if pricing/package asked
            pricing_keywords = ["rate", "rates", "package", "packages", "price", "pricing", "cost", "kharcha", "quotation", "quote"]
            if any(pw in inbound_lower for pw in pricing_keywords):
                if lead.status in ("New", "Contacted", None, "Active"):
                    lead.status = "Proposal Requested"
                    db.commit()

            # Auto-share brochure PDF if customer asks for brochure/profile/portfolio (ParshWebCraft only)
            is_pwc_lead = lead.company_id in ("parshwebcraft-default", "6186bed7-71bb-4532-abb9-b83542ae8530")
            brochure_keywords = [
                "brochure", "profile", "portfolio", "catalog", "services pdf",
                "brochure bhej", "profile bhej", "service list"
            ]
            if is_pwc_lead and any(bk in inbound_lower for bk in brochure_keywords):
                try:
                    b_path = pdf_generator.generate_agency_brochure_pdf()
                    public_base = os.environ.get("PUBLIC_BASE_URL", "https://api.parshagent.com").rstrip("/")
                    b_url = f"{public_base}/uploads/brochures/ParshWebCraft_Services_Overview.pdf"
                    b_caption = "Here is our official agency profile & services catalog from ParshWebCraft."
                    if whatsapp_cloud.is_configured():
                        whatsapp_cloud.send_document(
                            to=phone,
                            document_url=b_url,
                            filename="ParshWebCraft_Services_Overview.pdf",
                            caption=b_caption,
                            company_id=lead.company_id,
                        )
                    db.add(WhatsappMessage(
                        lead_id=lead.id,
                        company_id=lead.company_id,
                        direction="out",
                        message=f"[AI AUTO] [DOCUMENT] ParshWebCraft_Services_Overview.pdf - {b_caption}",
                        media_type="document",
                        media_url=b_url,
                        media_filename="ParshWebCraft_Services_Overview.pdf",
                        media_caption=b_caption,
                    ))
                    db.commit()
                    logger.info("Auto-delivered brochure PDF to %s", phone)
                except Exception as e:
                    logger.warning("Failed to auto-send brochure PDF: %s", e)

                # Auto-share quotation PDF if lead already has a quotation in the system
                quote_pdf_keywords = [
                    "quotation pdf", "quote bhej", "send quotation", "quotation share",
                    "quotation send", "share quote", "quote pdf"
                ]
                if any(qk in inbound_lower for qk in quote_pdf_keywords):
                    try:
                        existing_q = db.query(Quotation).filter(Quotation.lead_id == lead.id).order_by(Quotation.created_at.desc()).first()
                        if existing_q:
                            comp = db.query(Company).filter(Company.id == lead.company_id).first() if lead.company_id else None
                            comp_name = comp.name if comp else "ParshWebCraft Technologies"
                            q_path = pdf_generator.generate_quotation_pdf(
                                quotation_data={
                                    "quotation_number": existing_q.quotation_number,
                                    "amount": existing_q.amount,
                                    "status": existing_q.status,
                                    "created_at": existing_q.created_at,
                                    "items_json": existing_q.items_json,
                                },
                                lead_data={
                                    "name": lead.name,
                                    "phone": lead.phone,
                                    "email": lead.email or "",
                                    "city": lead.city or "",
                                    "company": lead.company or "",
                                },
                                company_data={"name": comp_name}
                            )
                            public_base = os.environ.get("PUBLIC_BASE_URL", "https://api.parshagent.com").rstrip("/")
                            q_filename = f"Quotation_{existing_q.quotation_number.replace('/', '_')}.pdf"
                            q_url = f"{public_base}/uploads/quotations/{existing_q.quotation_number.replace('/', '_')}.pdf"
                            existing_q.pdf_url = q_url
                            existing_q.status = "Sent"

                            q_caption = f"Official Quotation #{existing_q.quotation_number} from {comp_name} (Amount: Rs. {existing_q.amount:,.2f})."
                            if whatsapp_cloud.is_configured():
                                whatsapp_cloud.send_document(
                                    to=phone,
                                    document_url=q_url,
                                    filename=q_filename,
                                    caption=q_caption,
                                    company_id=lead.company_id,
                                )
                            db.add(WhatsappMessage(
                                lead_id=lead.id,
                                company_id=lead.company_id,
                                direction="out",
                                message=f"[AI AUTO] [DOCUMENT] {q_filename} - {q_caption}",
                                media_type="document",
                                media_url=q_url,
                                media_filename=q_filename,
                                media_caption=q_caption,
                            ))
                            db.commit()
                            logger.info("Auto-delivered quotation PDF %s to %s", existing_q.quotation_number, phone)
                    except Exception as e:
                        logger.warning("Failed to auto-send quotation PDF: %s", e)

                # Founder Alert: Only when customer explicitly asks for a meeting/call (avoid false positives like 'call baad me')
                inbound_lower = (it.get("message") or "").lower()
                negative_call_words = ["call baad", "call mat", "no call", "call ka last", "call nahi", "pahle requirement", "baad me", "baad mein", "later"]
                is_negative = any(nw in inbound_lower for nw in negative_call_words)
                meeting_intents = ["call kar lo", "call me", "book a call", "schedule call", "meeting schedule", "kab call", "call karo", "free for a call", "talk on call", "let's connect on call", "call par baat"]
                if not is_negative and any(w in inbound_lower for w in meeting_intents):
                    try:
                        alert_service.dispatch_dual_alert(
                            event_type="discovery_call",
                            lead=lead,
                            details={"notes": f"Customer meeting request in chat: '{it.get('message')}'"},
                            db=db,
                            company_id=lead.company_id,
                        )
                    except Exception as e:
                        logger.warning("Could not dispatch meeting dual alert: %s", e)
    return {"ok": True, "received": len(items)}


@router.post("/send-external/{lead_id}")
def send_external(lead_id: int, payload: SendIn,
                  db: Session = Depends(get_db),
                  _: User = Depends(get_current_user)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    if not lead.phone:
        raise HTTPException(400, "Lead has no phone number")

    sent = None
    delivered_via_cloud = False
    try:
        if whatsapp_cloud.is_configured():
            sent = whatsapp_cloud.send_text(lead.phone, payload.text, company_id=lead.company_id)
            delivered_via_cloud = True
    except whatsapp_cloud.WhatsappNotConfigured:
        pass
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"WhatsApp send failed: {e}")

    wamid = _extract_wamid(sent)
    msg = WhatsappMessage(
        lead_id=lead.id,
        company_id=lead.company_id,
        direction="out",
        message=payload.text,
        wa_message_id=wamid,
        status="sent" if wamid else "delivered"
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {
        "ok": True, "id": msg.id,
        "delivered_via_cloud": delivered_via_cloud,
        "meta_response": sent,
    }


@router.post("/upload-media")
async def upload_media(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user)
):
    """Upload document, image, or audio for sending via WhatsApp."""
    filename = file.filename or "attachment"
    ext = Path(filename).suffix.lower()

    if ext in (".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt"):
        media_type = "document"
    elif ext in (".png", ".jpg", ".jpeg", ".webp", ".gif"):
        media_type = "image"
    elif ext in (".mp3", ".ogg", ".wav", ".m4a"):
        media_type = "audio"
    elif ext in (".mp4", ".mov", ".avi"):
        media_type = "video"
    else:
        media_type = "document"

    safe_name = f"{uuid.uuid4().hex[:10]}_{re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)}"
    dest_dir = Path(__file__).resolve().parent.parent / "uploads" / "whatsapp"
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / safe_name

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(dest_path)
    public_base = os.environ.get("PUBLIC_BASE_URL", "https://api.parshagent.com").rstrip("/")
    public_url = f"{public_base}/uploads/whatsapp/{safe_name}"

    return {
        "ok": True,
        "filename": filename,
        "media_type": media_type,
        "media_url": public_url,
        "size_bytes": file_size,
    }


@router.post("/send-media/{lead_id}")
def send_media(
    lead_id: int,
    payload: SendMediaIn,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Deliver a rich document or image to a lead via WhatsApp Cloud API."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    if not lead.phone:
        raise HTTPException(400, "Lead has no phone number")

    sent = None
    delivered_via_cloud = False
    try:
        if whatsapp_cloud.is_configured():
            if payload.media_type == "document":
                sent = whatsapp_cloud.send_document(
                    to=lead.phone,
                    document_url=payload.media_url,
                    filename=payload.filename or "document.pdf",
                    caption=payload.caption,
                    company_id=lead.company_id,
                )
            elif payload.media_type == "image":
                sent = whatsapp_cloud.send_image(
                    to=lead.phone,
                    image_url=payload.media_url,
                    caption=payload.caption,
                    company_id=lead.company_id,
                )
            else:
                raise HTTPException(400, f"Unsupported media_type: {payload.media_type}")
            delivered_via_cloud = True
    except whatsapp_cloud.WhatsappNotConfigured:
        pass
    except Exception as e:
        logger.error("WhatsApp send media failed: %s", e)
        raise HTTPException(502, f"WhatsApp media send failed: {e}")

    caption_part = f" - {payload.caption}" if payload.caption else ""
    name_part = payload.filename or payload.media_url.split("/")[-1]
    msg_text = f"[{payload.media_type.upper()}] {name_part}{caption_part}"

    wamid = _extract_wamid(sent)
    msg = WhatsappMessage(
        lead_id=lead.id,
        company_id=lead.company_id,
        direction="out",
        message=msg_text,
        media_type=payload.media_type,
        media_url=payload.media_url,
        media_filename=payload.filename or name_part,
        media_caption=payload.caption,
        wa_message_id=wamid,
        status="sent" if wamid else "delivered",
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {
        "ok": True,
        "id": msg.id,
        "delivered_via_cloud": delivered_via_cloud,
        "meta_response": sent,
        "media_url": payload.media_url,
    }


@router.post("/send-interactive/{lead_id}")
def send_interactive(
    lead_id: int,
    payload: SendInteractiveIn,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Deliver interactive quick-reply buttons (up to 3) to a lead via WhatsApp Cloud API."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    if not lead.phone:
        raise HTTPException(400, "Lead has no phone number")
    if not payload.buttons:
        raise HTTPException(400, "At least 1 button is required")
    if len(payload.buttons) > 3:
        raise HTTPException(400, "WhatsApp Cloud API allows at most 3 interactive buttons")

    buttons_dicts = [b.model_dump() for b in payload.buttons]
    sent = None
    delivered_via_cloud = False
    try:
        if whatsapp_cloud.is_configured():
            sent = whatsapp_cloud.send_quick_reply_buttons(
                to=lead.phone,
                body=payload.body,
                buttons=buttons_dicts,
                header=payload.header,
                footer=payload.footer,
                company_id=lead.company_id,
            )
            delivered_via_cloud = True
    except whatsapp_cloud.WhatsappNotConfigured:
        pass
    except Exception as e:
        logger.error("WhatsApp send interactive failed: %s", e)
        raise HTTPException(502, f"WhatsApp interactive send failed: {e}")

    buttons_json_str = json.dumps(buttons_dicts)
    wamid = _extract_wamid(sent)
    msg = WhatsappMessage(
        lead_id=lead.id,
        company_id=lead.company_id,
        direction="out",
        message=payload.body,
        buttons_json=buttons_json_str,
        interactive_type="button",
        wa_message_id=wamid,
        status="sent" if wamid else "delivered",
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {
        "ok": True,
        "id": msg.id,
        "delivered_via_cloud": delivered_via_cloud,
        "meta_response": sent,
        "buttons": buttons_dicts,
    }


@router.post("/send-list/{lead_id}")
def send_list(
    lead_id: int,
    payload: SendListIn,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Deliver an interactive list menu (up to 10 options) to a lead via WhatsApp Cloud API."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    if not lead.phone:
        raise HTTPException(400, "Lead has no phone number")
    if not payload.sections:
        raise HTTPException(400, "At least 1 section is required")

    total_rows = sum(len(sec.rows) for sec in payload.sections)
    if total_rows == 0:
        raise HTTPException(400, "At least 1 item is required across sections")
    if total_rows > 10:
        raise HTTPException(400, "Meta WhatsApp Cloud API allows at most 10 list options")

    sections_dicts = [sec.model_dump() for sec in payload.sections]
    sent = None
    delivered_via_cloud = False
    try:
        if whatsapp_cloud.is_configured():
            sent = whatsapp_cloud.send_list_message(
                to=lead.phone,
                body=payload.body,
                button_text=payload.button_text,
                sections=sections_dicts,
                header=payload.header,
                footer=payload.footer,
                company_id=lead.company_id,
            )
            delivered_via_cloud = True
    except whatsapp_cloud.WhatsappNotConfigured:
        pass
    except Exception as e:
        logger.error("WhatsApp send list message failed: %s", e)
        raise HTTPException(502, f"WhatsApp list message send failed: {e}")

    list_payload = {
        "button_text": payload.button_text,
        "sections": sections_dicts,
        "header": payload.header,
        "footer": payload.footer,
    }
    wamid = _extract_wamid(sent)
    msg = WhatsappMessage(
        lead_id=lead.id,
        company_id=lead.company_id,
        direction="out",
        message=payload.body,
        buttons_json=json.dumps(list_payload),
        interactive_type="list",
        wa_message_id=wamid,
        status="sent" if wamid else "delivered",
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {
        "ok": True,
        "id": msg.id,
        "delivered_via_cloud": delivered_via_cloud,
        "meta_response": sent,
        "list": list_payload,
    }


@router.post("/send-cta-url/{lead_id}")
def send_cta_url(
    lead_id: int,
    payload: SendCtaUrlIn,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Deliver an interactive CTA URL button (e.g. Payment link, Portfolio, Direct WhatsApp/Call) to a lead via WhatsApp Cloud API."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    if not lead.phone:
        raise HTTPException(400, "Lead has no phone number")
    if not payload.body or not payload.body.strip():
        raise HTTPException(400, "Body text is required")
    if not payload.display_text or not payload.display_text.strip():
        raise HTTPException(400, "Button display text is required")
    if not payload.url or not payload.url.strip():
        raise HTTPException(400, "Target URL is required")

    url = payload.url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = f"https://{url}"

    display_text = payload.display_text.strip()[:20]

    sent = None
    delivered_via_cloud = False
    try:
        if whatsapp_cloud.is_configured():
            sent = whatsapp_cloud.send_cta_url_button(
                to=lead.phone,
                body=payload.body,
                display_text=display_text,
                url=url,
                header=payload.header,
                footer=payload.footer,
                company_id=lead.company_id,
            )
            delivered_via_cloud = True
    except whatsapp_cloud.WhatsappNotConfigured:
        pass
    except Exception as e:
        logger.error("WhatsApp send CTA URL failed: %s", e)
        raise HTTPException(502, f"WhatsApp CTA URL send failed: {e}")

    cta_payload = {
        "display_text": display_text,
        "url": url,
        "header": payload.header,
        "footer": payload.footer,
    }
    wamid = _extract_wamid(sent)
    msg = WhatsappMessage(
        lead_id=lead.id,
        company_id=lead.company_id,
        direction="out",
        message=payload.body,
        buttons_json=json.dumps(cta_payload),
        interactive_type="cta_url",
        wa_message_id=wamid,
        status="sent" if wamid else "delivered",
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {
        "ok": True,
        "id": msg.id,
        "delivered_via_cloud": delivered_via_cloud,
        "meta_response": sent,
        "cta": cta_payload,
    }



