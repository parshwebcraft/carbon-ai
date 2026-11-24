"""Background runner for Bulk WhatsApp Broadcasts with anti-ban pacing."""
from __future__ import annotations

import json
import logging
import random
import time
from datetime import datetime, timezone
from typing import Optional

from database import SessionLocal
from models import WhatsAppBroadcast, WhatsAppBroadcastRecipient, WhatsappMessage, Lead
from services import whatsapp_cloud

logger = logging.getLogger("facets.whatsapp_broadcast")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def run_broadcast_job(broadcast_id: int, company_id: Optional[str] = None):
    """Execute a WhatsApp broadcast campaign in the background with rate-limiting and jitter."""
    with SessionLocal() as db:
        broadcast: Optional[WhatsAppBroadcast] = db.query(WhatsAppBroadcast).filter(
            WhatsAppBroadcast.id == broadcast_id
        ).first()
        if not broadcast:
            logger.error("Broadcast %s not found", broadcast_id)
            return

        if broadcast.status == "cancelled":
            logger.info("Broadcast %s was cancelled before execution", broadcast_id)
            return

        broadcast.status = "running"
        broadcast.started_at = _utcnow()
        db.commit()

        recipients = (
            db.query(WhatsAppBroadcastRecipient)
            .filter(
                WhatsAppBroadcastRecipient.broadcast_id == broadcast_id,
                WhatsAppBroadcastRecipient.status == "pending",
            )
            .all()
        )

        buttons_data = None
        if broadcast.buttons_json:
            try:
                buttons_data = json.loads(broadcast.buttons_json)
            except Exception:
                buttons_data = None

        delay = max(1, broadcast.delay_seconds or 3)
        cid = broadcast.company_id

        logger.info(
            "Starting broadcast %s (%s) for %d recipients with %ds pacing",
            broadcast.id, broadcast.name, len(recipients), delay
        )

        for idx, rec in enumerate(recipients):
            # Check if cancelled mid-run
            db.refresh(broadcast)
            if broadcast.status == "cancelled":
                logger.info("Broadcast %s cancelled mid-run at recipient %d", broadcast_id, idx)
                break

            # Personalize message variables
            msg_text = broadcast.message_template or ""
            msg_text = msg_text.replace("{{name}}", (rec.name or "there").strip())
            msg_text = msg_text.replace("{{phone}}", (rec.phone or "").strip())
            msg_text = msg_text.replace("{{company}}", "Parsh Web Craft")

            # Replace city if lead is known
            city_val = ""
            if rec.lead_id:
                lead = db.query(Lead).filter(Lead.id == rec.lead_id).first()
                if lead and lead.city:
                    city_val = lead.city
            msg_text = msg_text.replace("{{city}}", city_val)

            rec.rendered_message = msg_text

            # Send via Meta Cloud API
            sent_ok = False
            wamid = None
            err_str = None

            try:
                if not whatsapp_cloud.is_configured():
                    # If WhatsApp not configured, simulate success in dev
                    sent_ok = True
                    wamid = f"wamid.sim_{int(time.time())}_{idx}"
                else:
                    if broadcast.interactive_type == "template" or msg_text.startswith("template:"):
                        tmpl_name = msg_text.replace("template:", "").strip() or "hello_world"
                        tmpl_lang = "en_US"
                        components = None

                        # Check if structured template metadata is passed in buttons_data
                        if isinstance(buttons_data, dict):
                            if buttons_data.get("template_name"):
                                tmpl_name = buttons_data["template_name"].strip()
                            if buttons_data.get("language"):
                                tmpl_lang = buttons_data["language"].strip()
                            vars_dict = buttons_data.get("variables") or {}
                            if vars_dict:
                                # Sorted variable indices: 1, 2, 3...
                                param_items = []
                                for k in sorted(vars_dict.keys(), key=lambda x: int(x) if str(x).isdigit() else 999):
                                    raw_val = str(vars_dict[k])
                                    # Resolve recipient tags
                                    res_val = raw_val.replace("{{name}}", (rec.name or "there").strip())
                                    res_val = res_val.replace("{{phone}}", (rec.phone or "").strip())
                                    res_val = res_val.replace("{{company}}", "Parsh Web Craft")
                                    res_val = res_val.replace("{{city}}", city_val)
                                    param_items.append({"type": "text", "text": res_val})
                                if param_items:
                                    components = [{"type": "body", "parameters": param_items}]

                        # Support media / image headers in template
                        header_img = broadcast.media_url or (isinstance(buttons_data, dict) and (buttons_data.get("media_url") or buttons_data.get("header_image_url")))
                        if header_img:
                            if not components:
                                components = []
                            components.insert(0, {
                                "type": "header",
                                "parameters": [
                                    {
                                        "type": "image",
                                        "image": {"link": header_img}
                                    }
                                ]
                            })
                        elif tmpl_name == "parshwebcraft_diwali_2026":
                            if not components:
                                components = []
                            components.insert(0, {
                                "type": "header",
                                "parameters": [
                                    {
                                        "type": "image",
                                        "image": {"link": "https://parshagent.com/images/parshwebcraft_diwali_2026.png"}
                                    }
                                ]
                            })
                            if not any(c.get("type") == "body" for c in components):
                                components.append({
                                    "type": "body",
                                    "parameters": [{"type": "text", "text": (rec.name or "Partner").strip()}]
                                })

                        r = whatsapp_cloud.send_template(
                            to=rec.phone,
                            template_name=tmpl_name,
                            language_code=tmpl_lang,
                            components=components,
                            company_id=cid,
                        )

                    elif broadcast.interactive_type == "button" and buttons_data:
                        # Quick reply buttons (up to 3)
                        r = whatsapp_cloud.send_quick_reply_buttons(
                            to=rec.phone,
                            body=msg_text,
                            buttons=buttons_data if isinstance(buttons_data, list) else [],
                            company_id=cid,
                        )
                    elif broadcast.interactive_type == "cta_url" and buttons_data:
                        # CTA URL button
                        display_text = buttons_data.get("display_text", "Open Link")
                        url = buttons_data.get("url", "https://parshwebcraft.com")
                        r = whatsapp_cloud.send_cta_url_button(
                            to=rec.phone,
                            body=msg_text,
                            display_text=display_text,
                            url=url,
                            header=buttons_data.get("header"),
                            footer=buttons_data.get("footer"),
                            company_id=cid,
                        )
                    elif broadcast.media_url and broadcast.media_type == "document":
                        r = whatsapp_cloud.send_document(
                            to=rec.phone,
                            doc_url=broadcast.media_url,
                            filename=broadcast.media_filename or "Document.pdf",
                            caption=msg_text,
                            company_id=cid,
                        )
                    elif broadcast.media_url and broadcast.media_type == "image":
                        r = whatsapp_cloud.send_image(
                            to=rec.phone,
                            img_url=broadcast.media_url,
                            caption=msg_text,
                            company_id=cid,
                        )
                    else:
                        r = whatsapp_cloud.send_text(to=rec.phone, body=msg_text, company_id=cid)

                    msgs = (r or {}).get("messages", [])
                    if msgs:
                        wamid = msgs[0].get("id")
                    sent_ok = True
            except Exception as e:
                err_str = str(e)[:300]
                logger.warning("Broadcast send failed for %s: %s", rec.phone, err_str)

            # Update recipient record
            if sent_ok:
                rec.status = "sent"
                rec.wa_message_id = wamid
                rec.sent_at = _utcnow()
                broadcast.sent_count = (broadcast.sent_count or 0) + 1

                # Record in CRM thread if lead_id exists
                if rec.lead_id:
                    rendered_body = f"[BROADCAST: {broadcast.name}] {msg_text}"
                    out_media_url = broadcast.media_url
                    out_media_type = broadcast.media_type

                    if broadcast.interactive_type == "template" or msg_text.startswith("template:"):
                        tmpl_clean = (msg_text.replace("template:", "").strip()) or "template"
                        if tmpl_clean == "parshwebcraft_diwali_2026":
                            rendered_body = (
                                f"[BROADCAST: {broadcast.name}]\n\n"
                                f"Wishing you and your family a very Happy & Prosperous Diwali, {rec.name or 'there'} ji! 🪔✨\n\n"
                                f"May the divine light of diyas bring endless happiness, good health, and immense success to your business and home.\n\n"
                                f"Thank you for being an esteemed part of the ParshWebCraft journey!\n\n"
                                f"Warm regards,\nGauransh & Team ParshWebCraft 🌟"
                            )
                            out_media_url = "https://parshagent.com/images/parshwebcraft_diwali_2026.png"
                            out_media_type = "image"
                        else:
                            rendered_body = f"[BROADCAST: {broadcast.name}] {tmpl_clean}"

                    db.add(
                        WhatsappMessage(
                            company_id=cid,
                            lead_id=rec.lead_id,
                            direction="out",
                            message=rendered_body,
                            media_type=out_media_type,
                            media_url=out_media_url,
                            media_filename=broadcast.media_filename,
                            buttons_json=broadcast.buttons_json,
                            interactive_type=broadcast.interactive_type,
                            wa_message_id=wamid,
                            status="sent",
                        )
                    )
            else:
                rec.status = "failed"
                rec.error_message = err_str or "Dispatch error"
                broadcast.failed_count = (broadcast.failed_count or 0) + 1

            db.commit()

            # Anti-ban sleep jitter between messages
            if idx < len(recipients) - 1:
                jitter = random.uniform(0.1, 0.6)
                time.sleep(delay + jitter)

        # Finalize campaign status
        db.refresh(broadcast)
        if broadcast.status != "cancelled":
            broadcast.status = "completed"
            broadcast.completed_at = _utcnow()
            db.commit()

        logger.info(
            "Broadcast %s completed: %d sent, %d failed",
            broadcast_id, broadcast.sent_count, broadcast.failed_count
        )
