import os
import httpx
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from database import get_db
from models import WhatsappMessage, Lead, User, WhatsAppAccount, Company, Activity
from schemas import WhatsappCreate, WhatsappOut
from deps import get_current_user, require_roles

logger = logging.getLogger("facets.whatsapp")
router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

class LeadStatusIn(BaseModel):
    status: str


@router.get("/conversations")
def list_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cid = current_user.company_id
    if not cid:
        return []

    lead_ids_sub = db.query(Lead.id).filter(Lead.company_id == cid).subquery()
    rows = (
        db.query(
            WhatsappMessage.lead_id,
            func.max(WhatsappMessage.created_at).label("last_at"),
            func.count(WhatsappMessage.id).label("count"),
        )
        .filter(WhatsappMessage.lead_id.in_(lead_ids_sub))
        .group_by(WhatsappMessage.lead_id)
        .order_by(func.max(WhatsappMessage.created_at).desc())
        .all()
    )
    result = []
    for lead_id, last_at, count in rows:
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        last_msg = (db.query(WhatsappMessage)
                      .filter(WhatsappMessage.lead_id == lead_id)
                      .order_by(WhatsappMessage.created_at.desc()).first())

        # Unread count: incoming messages after last outgoing
        last_out = (db.query(WhatsappMessage)
                      .filter(WhatsappMessage.lead_id == lead_id, WhatsappMessage.direction == "out")
                      .order_by(WhatsappMessage.created_at.desc()).first())
        if last_out:
            unread_count = (db.query(func.count(WhatsappMessage.id))
                              .filter(WhatsappMessage.lead_id == lead_id,
                                      WhatsappMessage.direction == "in",
                                      WhatsappMessage.created_at > last_out.created_at)
                              .scalar() or 0)
        else:
            unread_count = (db.query(func.count(WhatsappMessage.id))
                              .filter(WhatsappMessage.lead_id == lead_id,
                                      WhatsappMessage.direction == "in")
                              .scalar() or 0)

        result.append({
            "lead_id": lead_id,
            "lead_name": lead.name if lead else f"Lead #{lead_id}",
            "lead_phone": lead.phone if lead else None,
            "lead_status": (lead.status if lead and lead.status else "Unlabeled"),
            "lead_source": (lead.source if lead and lead.source else "WhatsApp"),
            "lead_email": (lead.email if lead and lead.email else ""),
            "lead_city": (lead.city if lead and lead.city else ""),
            "lead_budget": (lead.budget if lead and lead.budget else 0.0),
            "lead_notes": (lead.notes if lead and lead.notes else ""),
            "last_message": last_msg.message if last_msg else "",
            "last_direction": last_msg.direction if last_msg else "in",
            "last_status": last_msg.status if last_msg else None,
            "last_at": last_at,
            "count": count,
            "unread_count": unread_count,
            "ai_bot_paused": bool(lead.ai_bot_paused) if lead else False,
            "ai_bot_handover_reason": lead.ai_bot_handover_reason if lead else None,
        })
    return result


@router.patch("/lead-status/{lead_id}")
def update_lead_status(lead_id: int, payload: LeadStatusIn, db: Session = Depends(get_db),
                       _: User = Depends(get_current_user)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    lead.status = payload.status
    db.commit()
    return {"status": "ok", "lead_id": lead_id, "new_status": lead.status}


class ToggleAiBotIn(BaseModel):
    paused: bool
    reason: Optional[str] = None


@router.post("/leads/{lead_id}/toggle-ai-bot")
def toggle_ai_bot(lead_id: int, payload: ToggleAiBotIn, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")

    lead.ai_bot_paused = payload.paused
    lead.ai_bot_handover_reason = payload.reason if payload.paused else None

    note_text = (
        f"[INTERNAL NOTE] AI bot is paused for this chat ({payload.reason or 'manual agent pause'}). A human handles it."
        if payload.paused
        else "[INTERNAL NOTE] AI bot has been resumed for this chat. It will auto-reply to incoming messages."
    )
    db.add(WhatsappMessage(lead_id=lead.id, direction="note", message=note_text))
    db.commit()
    db.refresh(lead)
    return {
        "ok": True,
        "lead_id": lead.id,
        "ai_bot_paused": lead.ai_bot_paused,
        "ai_bot_handover_reason": lead.ai_bot_handover_reason,
    }


class ScheduleMeetingIn(BaseModel):
    meeting_time: str
    duration: int = 30
    title: Optional[str] = "Discovery Call"


@router.post("/leads/{lead_id}/schedule-meeting")
def schedule_meeting_whatsapp(lead_id: int, payload: ScheduleMeetingIn, db: Session = Depends(get_db),
                              current_user: User = Depends(get_current_user)):
    from services import whatsapp_cloud
    import uuid
    import datetime

    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    if not lead.phone:
        raise HTTPException(400, "Lead has no phone number")

    comp = db.query(Company).filter(Company.id == current_user.company_id).first() if current_user.company_id else None
    company_name = comp.name if comp else "Our Team"

    # Generate Google Meet link code (format: meet.google.com/xxx-yyyy-zzz)
    meet_code = f"{uuid.uuid4().hex[:3]}-{uuid.uuid4().hex[3:7]}-{uuid.uuid4().hex[7:10]}"
    meet_url = f"https://meet.google.com/{meet_code}"

    # Format readable time
    try:
        dt = datetime.datetime.fromisoformat(payload.meeting_time.replace("Z", "+00:00"))
        time_str = dt.strftime("%d %b %Y, %I:%M %p")
    except Exception:
        time_str = payload.meeting_time

    title = payload.title or f"Discovery Call with {company_name}"

    msg_text = (
        f"📅 *Meeting Scheduled with {company_name}*\n\n"
        f"👤 *Guest:* {lead.name}\n"
        f"🗓️ *Date & Time:* {time_str} (IST)\n"
        f"⏱️ *Duration:* {payload.duration} minutes\n"
        f"📌 *Topic:* {title}\n\n"
        f"📹 *Google Meet Link:*\n{meet_url}\n\n"
        f"Please click the link above to join at the scheduled time. Looking forward to our conversation!"
    )

    # Send via WhatsApp Cloud API
    delivered = False
    try:
        if whatsapp_cloud.is_configured():
            whatsapp_cloud.send_text(lead.phone, msg_text)
            delivered = True
    except Exception as e:
        logger.warning("Failed to send meeting link via Cloud API: %s", e)

    # Save in messages
    msg_rec = WhatsappMessage(lead_id=lead.id, direction="out", message=msg_text)
    db.add(msg_rec)

    # Save activity
    db.add(Activity(
        company_id=current_user.company_id,
        lead_id=lead.id,
        activity_type="Meeting",
        description=f"Scheduled meeting '{title}' for {time_str} with Google Meet: {meet_url}",
        created_by=current_user.id
    ))
    db.commit()
    db.refresh(msg_rec)

    return {
        "ok": True,
        "meet_url": meet_url,
        "meeting_time": time_str,
        "message": msg_text,
        "delivered": delivered,
        "msg_id": msg_rec.id,
    }


# ── Meta WhatsApp Embedded Signup Endpoints ─────────────────────────────────

class EmbeddedSignupCallbackIn(BaseModel):
    code: str
    waba_id: Optional[str] = None
    phone_number_id: Optional[str] = None


@router.get("/embedded-signup/config")
def get_embedded_signup_config(_: User = Depends(get_current_user)):
    """Returns Meta App ID and Config ID for Facebook JS SDK login."""
    app_id = os.environ.get("META_APP_ID", "1598038242335524").strip()
    config_id = os.environ.get("META_CONFIG_ID", "3462057927307282").strip()
    return {
        "app_id": app_id,
        "config_id": config_id,
        "version": "v21.0"
    }


@router.get("/connection-status")
def get_connection_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Checks current active WhatsApp Business connection status."""
    cid = current_user.company_id
    account = db.query(WhatsAppAccount).filter(WhatsAppAccount.company_id == cid).order_by(WhatsAppAccount.id.desc()).first() if cid else None
    if not account and current_user.email in ("admin@parshagent.com", "admin@parshwebcraft.com"):
        account = db.query(WhatsAppAccount).order_by(WhatsAppAccount.id.desc()).first()

    phone_id = (account.phone_number_id if account and account.phone_number_id else (os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "") if current_user.email in ("admin@parshagent.com", "admin@parshwebcraft.com") else "")).strip()
    waba_id = (account.waba_id if account and account.waba_id else (os.environ.get("WHATSAPP_BUSINESS_ACCOUNT_ID", "") if current_user.email in ("admin@parshagent.com", "admin@parshwebcraft.com") else "")).strip()
    token = (account.access_token if account and account.access_token else (os.environ.get("WHATSAPP_TOKEN", "") if current_user.email in ("admin@parshagent.com", "admin@parshwebcraft.com") else "")).strip()

    if not phone_id or not token:
        return {
            "connected": False,
            "display_phone_number": None,
            "verified_name": None,
            "quality_rating": None,
            "phone_number_id": None,
            "waba_id": None,
            "app_id": os.environ.get("META_APP_ID", "1598038242335524").strip(),
            "webhook_url": "https://parshagent.com/api/whatsapp/webhook",
            "verify_token": os.environ.get("WHATSAPP_VERIFY_TOKEN", "ParshAgent_WA_Verify_2026_9xK7mP4q").strip(),
        }

    # Query Meta Graph API for fresh live info
    verified_name = account.verified_name if account else None
    display_phone = account.display_phone_number if account else None
    quality_rating = account.quality_rating if account else "GREEN"

    try:
        with httpx.Client(timeout=8.0) as client:
            r = client.get(
                f"https://graph.facebook.com/v21.0/{phone_id}",
                headers={"Authorization": f"Bearer {token}"},
                params={"fields": "display_phone_number,verified_name,quality_rating,code_verification_status"}
            )
            if r.status_code == 200:
                data = r.json()
                display_phone = data.get("display_phone_number") or display_phone
                verified_name = data.get("verified_name") or verified_name
                quality_rating = data.get("quality_rating") or quality_rating
                if account:
                    account.display_phone_number = display_phone
                    account.verified_name = verified_name
                    account.quality_rating = quality_rating
                    db.commit()
    except Exception as e:
        logger.warning("Could not fetch fresh phone details from Meta: %s", e)

    return {
        "connected": True,
        "display_phone_number": display_phone or ("+91 WhatsApp Account" if phone_id else None),
        "verified_name": verified_name or "Official WhatsApp Business",
        "quality_rating": quality_rating or "GREEN",
        "phone_number_id": phone_id,
        "waba_id": waba_id,
        "app_id": os.environ.get("META_APP_ID", "1598038242335524").strip(),
        "webhook_url": "https://parshagent.com/api/whatsapp/webhook",
        "verify_token": os.environ.get("WHATSAPP_VERIFY_TOKEN", "ParshAgent_WA_Verify_2026_9xK7mP4q").strip(),
    }


@router.post("/embedded-signup/callback")
def handle_embedded_signup_callback(payload: EmbeddedSignupCallbackIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Receives code from Meta Embedded Signup popup, exchanges for token, subscribes WABA webhook."""
    app_id = os.environ.get("META_APP_ID", "1598038242335524").strip()
    app_secret = os.environ.get("META_APP_SECRET", "07a1a3657a3a870b1a68e0af59d7a6bb").strip()

    if not payload.code:
        raise HTTPException(400, "Authorization code is required from Meta popup")

    # 1. Exchange code for access token
    with httpx.Client(timeout=20.0) as client:
        token_resp = client.get(
            "https://graph.facebook.com/v21.0/oauth/access_token",
            params={
                "client_id": app_id,
                "client_secret": app_secret,
                "code": payload.code
            }
        )
        if token_resp.status_code != 200:
            logger.error("Token exchange failed: %s", token_resp.text)
            raise HTTPException(400, f"Meta token exchange failed: {token_resp.text}")

        token_data = token_resp.json()
        user_access_token = token_data.get("access_token")

        waba_id = payload.waba_id
        phone_number_id = payload.phone_number_id
        display_phone = None
        verified_name = None
        quality_rating = "GREEN"

        # 2. Subscribe app to client's WABA
        if waba_id:
            try:
                sub_resp = client.post(
                    f"https://graph.facebook.com/v21.0/{waba_id}/subscribed_apps",
                    headers={"Authorization": f"Bearer {user_access_token}"}
                )
                logger.info("WABA subscribed_apps response: %s", sub_resp.text)
            except Exception as e:
                logger.warning("Failed to subscribe app to WABA %s: %s", waba_id, e)

        # 2.5 Auto-discover phone_number_id if not directly present
        if not phone_number_id and waba_id:
            try:
                phones_resp = client.get(
                    f"https://graph.facebook.com/v21.0/{waba_id}/phone_numbers",
                    headers={"Authorization": f"Bearer {user_access_token}"}
                )
                if phones_resp.status_code == 200:
                    p_items = phones_resp.json().get("data", [])
                    if p_items:
                        phone_number_id = p_items[0].get("id")
                        display_phone = p_items[0].get("display_phone_number")
                        verified_name = p_items[0].get("verified_name")
                        quality_rating = p_items[0].get("quality_rating", "GREEN")
                        logger.info("Auto-discovered phone_number_id %s from WABA %s", phone_number_id, waba_id)
            except Exception as e:
                logger.warning("Failed to auto-discover phone numbers from WABA %s: %s", waba_id, e)

        # 3. If phone_number_id provided, fetch details and register
        if phone_number_id:
            try:
                phone_resp = client.get(
                    f"https://graph.facebook.com/v21.0/{phone_number_id}",
                    headers={"Authorization": f"Bearer {user_access_token}"},
                    params={"fields": "display_phone_number,verified_name,quality_rating"}
                )
                if phone_resp.status_code == 200:
                    pdata = phone_resp.json()
                    display_phone = pdata.get("display_phone_number")
                    verified_name = pdata.get("verified_name")
                    quality_rating = pdata.get("quality_rating", "GREEN")
            except Exception as e:
                logger.warning("Failed to fetch phone info: %s", e)

            # Register number with Cloud API (6-digit PIN)
            try:
                client.post(
                    f"https://graph.facebook.com/v21.0/{phone_number_id}/register",
                    headers={"Authorization": f"Bearer {user_access_token}"},
                    json={"messaging_product": "whatsapp", "pin": "123456"}
                )
            except Exception as e:
                logger.warning("Number registration attempt: %s", e)

        # 4. Save into Database
        cid = current_user.company_id
        account = db.query(WhatsAppAccount).filter(WhatsAppAccount.company_id == cid).first() if cid else None
        if not account:
            account = WhatsAppAccount(
                company_id=cid,
                waba_id=waba_id,
                phone_number_id=phone_number_id,
                display_phone_number=display_phone,
                verified_name=verified_name,
                access_token=user_access_token,
                status="CONNECTED",
                quality_rating=quality_rating,
            )
            db.add(account)
        else:
            account.company_id = cid or account.company_id
            account.waba_id = waba_id or account.waba_id
            account.phone_number_id = phone_number_id or account.phone_number_id
            account.display_phone_number = display_phone or account.display_phone_number
            account.verified_name = verified_name or account.verified_name
            account.access_token = user_access_token
            account.status = "CONNECTED"
            account.quality_rating = quality_rating

        db.commit()
        db.refresh(account)

    return {
        "success": True,
        "message": "WhatsApp Business Account connected successfully via Meta Embedded Signup!",
        "waba_id": account.waba_id,
        "phone_number_id": account.phone_number_id,
        "display_phone_number": account.display_phone_number,
        "verified_name": account.verified_name,
        "quality_rating": account.quality_rating
    }


@router.post("/disconnect")
def disconnect_whatsapp(db: Session = Depends(get_db), current_user: User = Depends(require_roles("Admin", "Manager"))):
    cid = current_user.company_id
    account = db.query(WhatsAppAccount).filter(WhatsAppAccount.company_id == cid).first() if cid else None
    if account:
        account.status = "DISCONNECTED"
        account.access_token = None
        db.commit()
    return {"success": True, "message": "WhatsApp account disconnected"}


class ManualConnectIn(BaseModel):
    phone_number_id: str
    waba_id: Optional[str] = None
    access_token: Optional[str] = None


@router.post("/manual-connect")
def manual_connect_whatsapp(payload: ManualConnectIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Allows manual connection by supplying Phone Number ID, WABA ID, and permanent access token."""
    phone_id = payload.phone_number_id.strip()
    token = (payload.access_token or "").strip()
    waba_id = (payload.waba_id or "").strip()

    cid = current_user.company_id
    account = db.query(WhatsAppAccount).filter(WhatsAppAccount.company_id == cid).first() if cid else None

    # Fallback to existing saved token if not re-entered
    if not token or token in ("••••••••", "........", "***"):
        if account and account.access_token:
            token = account.access_token
        else:
            raise HTTPException(400, "Phone Number ID and Access Token are required")

    if not phone_id or not token:
        raise HTTPException(400, "Phone Number ID and Access Token are required")

    # Validate with Meta Graph API
    display_phone = None
    verified_name = None
    quality_rating = "GREEN"
    try:
        with httpx.Client(timeout=10.0) as client:
            r = client.get(
                f"https://graph.facebook.com/v21.0/{phone_id}",
                headers={"Authorization": f"Bearer {token}"},
                params={"fields": "display_phone_number,verified_name,quality_rating"}
            )
            if r.status_code == 200:
                data = r.json()
                display_phone = data.get("display_phone_number")
                verified_name = data.get("verified_name")
                quality_rating = data.get("quality_rating", "GREEN")
            else:
                logger.warning("Meta Graph API validation warning: %s", r.text)
    except Exception as e:
        logger.warning("Could not reach Meta to validate phone: %s", e)

    if not account:
        account = WhatsAppAccount(
            company_id=cid,
            waba_id=waba_id or None,
            phone_number_id=phone_id,
            display_phone_number=display_phone or f"+{phone_id}",
            verified_name=verified_name or "WhatsApp Business",
            access_token=token,
            status="CONNECTED",
            quality_rating=quality_rating,
        )
        db.add(account)
    else:
        account.company_id = cid or account.company_id
        account.waba_id = waba_id or account.waba_id
        account.phone_number_id = phone_id
        account.display_phone_number = display_phone or account.display_phone_number
        account.verified_name = verified_name or account.verified_name
        account.access_token = token
        account.status = "CONNECTED"
        account.quality_rating = quality_rating

    db.commit()
    db.refresh(account)

    return {
        "success": True,
        "message": "WhatsApp Account connected successfully!",
        "waba_id": account.waba_id,
        "phone_number_id": account.phone_number_id,
        "display_phone_number": account.display_phone_number,
        "verified_name": account.verified_name,
        "quality_rating": account.quality_rating,
    }


class FetchMetaDetailsIn(BaseModel):
    phone_number_id: str
    access_token: Optional[str] = None


@router.post("/fetch-meta-details")
def fetch_meta_details(payload: FetchMetaDetailsIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Tests connection to Meta Graph API and fetches live Phone Number details."""
    phone_id = payload.phone_number_id.strip()
    token = (payload.access_token or "").strip()

    # Fallback to company's existing saved token if not re-entered
    if not token or token in ("••••••••", "........", "***"):
        cid = current_user.company_id
        acc = db.query(WhatsAppAccount).filter(WhatsAppAccount.company_id == cid).first() if cid else None
        if acc and acc.access_token:
            token = acc.access_token

    if not phone_id or not token:
        raise HTTPException(400, "Phone Number ID and Access Token are required")

    try:
        with httpx.Client(timeout=10.0) as client:
            r = client.get(
                f"https://graph.facebook.com/v21.0/{phone_id}",
                headers={"Authorization": f"Bearer {token}"},
                params={"fields": "display_phone_number,verified_name,quality_rating,code_verification_status"}
            )
            if r.status_code == 200:
                data = r.json()
                return {
                    "success": True,
                    "display_phone_number": data.get("display_phone_number"),
                    "verified_name": data.get("verified_name"),
                    "quality_rating": data.get("quality_rating", "GREEN"),
                    "code_verification_status": data.get("code_verification_status"),
                }
            else:
                err_data = r.json() if "application/json" in r.headers.get("content-type", "") else {}
                err_msg = err_data.get("error", {}).get("message", r.text)
                return {
                    "success": False,
                    "message": f"Meta error: {err_msg}"
                }
    except Exception as e:
        return {
            "success": False,
            "message": f"Connection check failed: {str(e)}"
        }


@router.get("/{lead_id}", response_model=List[WhatsappOut])
def get_thread(lead_id: int, db: Session = Depends(get_db),
               _: User = Depends(get_current_user)):
    msgs = (db.query(WhatsappMessage)
              .filter(WhatsappMessage.lead_id == lead_id)
              .order_by(WhatsappMessage.created_at.asc()).all())
    return [WhatsappOut.model_validate(m) for m in msgs]


@router.post("", response_model=WhatsappOut, status_code=201)
def send_message(payload: WhatsappCreate, db: Session = Depends(get_db),
                 _: User = Depends(get_current_user)):
    m = WhatsappMessage(**payload.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return WhatsappOut.model_validate(m)


@router.delete("/{msg_id}", status_code=204)
def delete_message(msg_id: int, db: Session = Depends(get_db),
                   _: User = Depends(get_current_user)):
    m = db.query(WhatsappMessage).filter(WhatsappMessage.id == msg_id).first()
    if not m:
        raise HTTPException(404, "Message not found")
    db.delete(m)
    db.commit()
    return None


@router.delete("/thread/{lead_id}", status_code=204)
def delete_thread(lead_id: int, db: Session = Depends(get_db),
                  _: User = Depends(require_roles("Admin", "Manager"))):
    db.query(WhatsappMessage).filter(WhatsappMessage.lead_id == lead_id).delete(synchronize_session=False)
    db.commit()
    return None


@router.post("/delete-multiple", status_code=204)
def delete_multiple_whatsapp(msg_ids: list[int], db: Session = Depends(get_db),
                             _: User = Depends(require_roles("Admin", "Manager"))):
    db.query(WhatsappMessage).filter(WhatsappMessage.id.in_(msg_ids)).delete(synchronize_session=False)
    db.commit()
    return None


@router.post("/delete-all", status_code=204)
def delete_all_whatsapp(db: Session = Depends(get_db),
                        _: User = Depends(require_roles("Admin", "Manager"))):
    db.query(WhatsappMessage).delete(synchronize_session=False)
    db.commit()
    return None


