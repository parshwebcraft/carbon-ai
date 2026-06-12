"""Vapi outbound voice agent endpoints + webhook."""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Lead, Call, AIAgentLog, Activity, User
from deps import get_current_user
from services import vapi_voice, deepseek

logger = logging.getLogger("facets.voice")
router = APIRouter(prefix="/voice", tags=["voice"])


class PlaceCallOut(BaseModel):
    call_id: int
    vapi_call_id: Optional[str] = None
    status: str
    raw: Optional[dict] = None


@router.get("/status")
def status():
    return {"vapi_configured": vapi_voice.is_configured()}


@router.post("/place-call/{lead_id}", response_model=PlaceCallOut)
def place_call(lead_id: int, with_ai_script: bool = True,
               db: Session = Depends(get_db),
               me: User = Depends(get_current_user)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    if not lead.phone:
        raise HTTPException(400, "Lead has no phone number")

    # Optionally produce a tailored script that's fed into the AI agent
    script_text = None
    if with_ai_script:
        try:
            history = (db.query(Activity)
                         .filter(Activity.lead_id == lead_id)
                         .order_by(Activity.created_at.desc()).limit(8).all())
            script_text = deepseek.call_script(
                {"name": lead.name, "city": lead.city,
                 "customer_type": lead.customer_type,
                 "budget": lead.budget, "status": lead.status},
                [{"activity_type": a.activity_type, "description": a.description} for a in history],
            )
        except Exception as e:  # noqa: BLE001
            logger.info("call_script skipped: %s", e)

    try:
        resp = vapi_voice.place_call(
            to_number=lead.phone, lead={
                "name": lead.name, "city": lead.city,
                "customer_type": lead.customer_type,
                "budget": lead.budget, "status": lead.status,
            },
            script=script_text,
        )
    except vapi_voice.VapiNotConfigured as e:
        raise HTTPException(503, str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"Vapi error: {e}")

    vapi_id = resp.get("id")
    call = Call(
        lead_id=lead.id,
        call_status="In Progress",
        call_summary="AI voice call initiated by " + (me.name or me.email),
        call_duration=0,
        vapi_call_id=vapi_id,
    )
    db.add(call)
    db.add(Activity(
        lead_id=lead.id, activity_type="Call",
        description=f"AI voice call started (Vapi {vapi_id or '?'})",
        created_by=me.id,
    ))
    db.commit()
    db.refresh(call)
    return PlaceCallOut(call_id=call.id, vapi_call_id=vapi_id,
                        status=resp.get("status", "queued"), raw=resp)


@router.post("/webhook")
async def webhook(req: Request, db: Session = Depends(get_db)):
    """Vapi end-of-call report + status updates.

    Authentication: Vapi can be configured to send a `secret` header; we tolerate
    its absence in MVP. The endpoint is idempotent on `vapi_call_id`.
    """
    try:
        body = await req.json()
    except Exception:
        body = {}
    msg = body.get("message") or body
    msg_type = msg.get("type") or body.get("type")
    call_info = msg.get("call") or {}
    vapi_id = call_info.get("id") or msg.get("callId") or body.get("callId")

    if not vapi_id:
        return {"ok": True, "ignored": "no vapi call id"}

    call = db.query(Call).filter(Call.vapi_call_id == vapi_id).first()
    if not call:
        logger.info("Unknown vapi call id %s — skipping", vapi_id)
        return {"ok": True, "ignored": "unknown call"}

    if msg_type == "status-update":
        status = msg.get("status") or "Updated"
        call.call_status = "Completed" if status == "ended" else "In Progress"
    elif msg_type == "end-of-call-report":
        call.call_status = "Completed"
        call.call_duration = int(msg.get("durationSeconds") or msg.get("duration") or 0)
        call.call_summary = msg.get("summary") or call.call_summary
        call.transcript = msg.get("transcript") or None
        analysis = msg.get("analysis") or {}
        sentiment = (analysis.get("sentiment") or "").capitalize()
        if sentiment in ("Positive", "Neutral", "Negative"):
            call.sentiment = sentiment
        # Push to AI agent log so it surfaces on lead timeline
        db.add(AIAgentLog(
            lead_id=call.lead_id,
            conversation_summary=call.call_summary,
            sentiment=call.sentiment or "Neutral",
            next_action=(analysis.get("successEvaluation") or "Follow up with customer"),
        ))
    db.commit()
    return {"ok": True}
