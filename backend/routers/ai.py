"""AI helper endpoints (DeepSeek) — reply suggest, call insights, call script."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Lead, Call, WhatsappMessage, Activity, AIAgentLog, User
from deps import get_current_user
from services import deepseek

router = APIRouter(prefix="/ai", tags=["ai"])


class ReplyOut(BaseModel):
    reply: str


class InsightsOut(BaseModel):
    summary: str
    sentiment: str
    next_action: str


class ScriptOut(BaseModel):
    script: str


@router.get("/status")
def status():
    import os
    return {
        "deepseek_configured": bool(os.environ.get("DEEPSEEK_API_KEY")),
        "vapi_configured": bool(os.environ.get("VAPI_API_KEY")) and bool(os.environ.get("VAPI_PHONE_NUMBER_ID")),
        "whatsapp_configured": bool(os.environ.get("WHATSAPP_TOKEN")) and bool(os.environ.get("WHATSAPP_PHONE_NUMBER_ID")),
        "automation_auto_reply": (os.environ.get("AUTOMATION_AUTO_REPLY", "false").lower() == "true"),
        "automation_followup": (os.environ.get("AUTOMATION_FOLLOWUP_ENABLED", "false").lower() == "true"),
    }


@router.post("/whatsapp-reply/{lead_id}", response_model=ReplyOut)
def whatsapp_reply(lead_id: int, db: Session = Depends(get_db),
                   _: User = Depends(get_current_user)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    history = (db.query(WhatsappMessage)
                 .filter(WhatsappMessage.lead_id == lead_id)
                 .order_by(WhatsappMessage.created_at.asc()).all())
    try:
        reply = deepseek.whatsapp_reply(
            {"name": lead.name, "city": lead.city, "customer_type": lead.customer_type,
             "budget": lead.budget, "status": lead.status},
            [{"direction": m.direction, "message": m.message} for m in history],
        )
    except deepseek.DeepSeekNotConfigured as e:
        raise HTTPException(503, str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"AI error: {e}")
    return ReplyOut(reply=reply)


@router.post("/call-insights/{call_id}", response_model=InsightsOut)
def call_insights(call_id: int, db: Session = Depends(get_db),
                  _: User = Depends(get_current_user)):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(404, "Call not found")
    lead = db.query(Lead).filter(Lead.id == call.lead_id).first()
    try:
        data = deepseek.call_insights(
            {"call_status": call.call_status, "call_duration": call.call_duration,
             "call_summary": call.call_summary, "transcript": getattr(call, "transcript", None)},
            {"name": lead.name if lead else "Customer",
             "customer_type": lead.customer_type if lead else None,
             "status": lead.status if lead else None,
             "budget": lead.budget if lead else 0},
        )
    except deepseek.DeepSeekNotConfigured as e:
        raise HTTPException(503, str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"AI error: {e}")

    # Persist into AIAgentLog so it shows on the lead timeline.
    db.add(AIAgentLog(
        lead_id=call.lead_id,
        conversation_summary=data.get("summary"),
        sentiment=data.get("sentiment"),
        next_action=data.get("next_action"),
    ))
    db.commit()
    return InsightsOut(
        summary=data.get("summary", ""),
        sentiment=data.get("sentiment", "Neutral"),
        next_action=data.get("next_action", ""),
    )


@router.post("/call-script/{lead_id}", response_model=ScriptOut)
def call_script(lead_id: int, db: Session = Depends(get_db),
                _: User = Depends(get_current_user)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    history = (db.query(Activity)
                 .filter(Activity.lead_id == lead_id)
                 .order_by(Activity.created_at.desc()).limit(8).all())
    try:
        text = deepseek.call_script(
            {"name": lead.name, "city": lead.city, "customer_type": lead.customer_type,
             "budget": lead.budget, "status": lead.status},
            [{"activity_type": a.activity_type, "description": a.description} for a in history],
        )
    except deepseek.DeepSeekNotConfigured as e:
        raise HTTPException(503, str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"AI error: {e}")
    return ScriptOut(script=text)


@router.post("/whatsapp-analyse/{lead_id}")
def whatsapp_analyse(lead_id: int, db: Session = Depends(get_db),
                     _: User = Depends(get_current_user)):
    """Full AI analysis of a WhatsApp conversation thread.

    Returns: intent, sentiment, objections, conversion_probability, next_action, summary
    """
    from services import copilot as copilot_svc

    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    history = (db.query(WhatsappMessage)
                 .filter(WhatsappMessage.lead_id == lead_id)
                 .order_by(WhatsappMessage.created_at.asc()).all())
    messages = [{"direction": m.direction, "message": m.message} for m in history]
    lead_dict = {
        "name": lead.name, "city": lead.city,
        "customer_type": lead.customer_type,
        "budget": lead.budget, "status": lead.status,
    }
    try:
        result = copilot_svc.analyse_whatsapp_thread(messages, lead_dict)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"AI error: {e}")
    return result
