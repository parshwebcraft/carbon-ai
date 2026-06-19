"""Meta WhatsApp Cloud webhook + outbound send routes.

- GET  /api/whatsapp/webhook — Meta verification handshake.
- POST /api/whatsapp/webhook — Receives inbound messages, auto-creates a Lead if
        unknown, optionally auto-replies with DeepSeek.
- POST /api/whatsapp/send-external/{lead_id} — Sends a real message via Meta
        Cloud API, also writes to local DB so it appears in the UI.
"""
import logging
import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Lead, WhatsappMessage, User
from deps import get_current_user
from services import whatsapp_cloud, llm

logger = logging.getLogger("facets.whatsapp")
router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


class SendIn(BaseModel):
    text: str


def _auto_reply_enabled() -> bool:
    return os.environ.get("AUTOMATION_AUTO_REPLY", "false").lower() == "true"


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
async def receive(request: Request, db: Session = Depends(get_db)):
    try:
        payload = await request.json()
    except Exception:
        payload = {}
    items = whatsapp_cloud.parse_inbound(payload)
    if not items:
        return {"ok": True, "received": 0}

    for it in items:
        phone = it["from_number"]
        # Find or create lead by phone fragment (last 10 digits match)
        last10 = (phone or "")[-10:]
        lead = (db.query(Lead)
                  .filter(Lead.phone.like(f"%{last10}"))
                  .order_by(Lead.created_at.desc())
                  .first()) if last10 else None
        if lead is None:
            lead = Lead(
                name=(it.get("name") or f"WhatsApp +{phone}")[:160],
                phone=f"+{phone}" if not str(phone).startswith("+") else phone,
                source="WhatsApp", status="New",
                customer_type="Gold Buyer",
                notes="Auto-created from WhatsApp Cloud API webhook.",
            )
            db.add(lead)
            db.commit()
            db.refresh(lead)
            logger.info("Auto-created lead %s for inbound WhatsApp %s", lead.id, phone)

        # Persist inbound
        db.add(WhatsappMessage(lead_id=lead.id, direction="in", message=it["message"]))
        db.commit()

        # Auto-reply
        if _auto_reply_enabled() and (os.environ.get("OPENAI_API_KEY") or os.environ.get("DEEPSEEK_API_KEY")):
            history = (db.query(WhatsappMessage)
                         .filter(WhatsappMessage.lead_id == lead.id)
                         .order_by(WhatsappMessage.created_at.asc()).all())
            try:
                reply = llm.whatsapp_reply(
                    {"name": lead.name, "city": lead.city,
                     "customer_type": lead.customer_type, "budget": lead.budget,
                     "status": lead.status},
                    [{"direction": m.direction, "message": m.message} for m in history],
                )
            except Exception as e:  # noqa: BLE001
                logger.warning("AI reply failed: %s", e)
                reply = None
            if reply:
                try:
                    if whatsapp_cloud.is_configured():
                        whatsapp_cloud.send_text(phone, reply)
                except Exception as e:  # noqa: BLE001
                    logger.warning("Cloud send failed: %s", e)
                db.add(WhatsappMessage(
                    lead_id=lead.id, direction="out",
                    message=f"[AI AUTO] {reply}",
                ))
                db.commit()
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
            sent = whatsapp_cloud.send_text(lead.phone, payload.text)
            delivered_via_cloud = True
    except whatsapp_cloud.WhatsappNotConfigured:
        pass
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"WhatsApp send failed: {e}")

    msg = WhatsappMessage(lead_id=lead.id, direction="out", message=payload.text)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {
        "ok": True, "id": msg.id,
        "delivered_via_cloud": delivered_via_cloud,
        "meta_response": sent,
    }
