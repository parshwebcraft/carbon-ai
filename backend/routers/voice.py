"""Vapi outbound voice agent endpoints + webhook."""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Lead, Call, AIAgentLog, Activity, User
from deps import get_current_user
from services import vapi_voice, omnidim_voice, llm

logger = logging.getLogger("facets.voice")
router = APIRouter(prefix="/voice", tags=["voice"])


class PlaceCallOut(BaseModel):
    call_id: int
    vapi_call_id: Optional[str] = None
    status: str
    raw: Optional[dict] = None


@router.get("/status")
def status(db: Session = Depends(get_db)):
    return {
        "vapi_configured": vapi_voice.is_configured(db),
        "omnidim_configured": omnidim_voice.is_configured(db),
        "provider": "omnidim" if omnidim_voice.is_configured(db) else ("vapi" if vapi_voice.is_configured(db) else "mock")
    }


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
            script_text = llm.call_script(
                {"name": lead.name, "city": lead.city,
                 "customer_type": lead.customer_type,
                 "budget": lead.budget, "status": lead.status},
                [{"activity_type": a.activity_type, "description": a.description} for a in history],
            )
        except Exception as e:  # noqa: BLE001
            logger.info("call_script skipped: %s", e)

    call_provider = "omnidim" if omnidim_voice.is_configured(db) else "vapi"
    call_id_str = None
    resp = {}

    if call_provider == "omnidim":
        try:
            resp = omnidim_voice.place_call(
                to_number=lead.phone,
                lead={
                    "id": lead.id,
                    "name": lead.name,
                    "city": lead.city,
                    "customer_type": lead.customer_type,
                    "budget": lead.budget,
                    "status": lead.status,
                    "notes": script_text
                },
                script=script_text,
                db=db
            )
            call_id_str = resp.get("id")
        except Exception as e:
            raise HTTPException(502, f"OmniDimension call error: {e}")
    else:
        try:
            resp = vapi_voice.place_call(
                to_number=lead.phone, lead={
                    "name": lead.name, "city": lead.city,
                    "customer_type": lead.customer_type,
                    "budget": lead.budget, "status": lead.status,
                },
                script=script_text,
                db=db,
            )
            call_id_str = resp.get("id")
        except vapi_voice.VapiNotConfigured as e:
            raise HTTPException(503, str(e))
        except Exception as e:  # noqa: BLE001
            raise HTTPException(502, f"Vapi error: {e}")

    call = Call(
        lead_id=lead.id,
        call_status="In Progress",
        call_summary=f"AI voice call ({call_provider.title()}) initiated by " + (me.name or me.email),
        call_duration=0,
        vapi_call_id=call_id_str,
    )
    db.add(call)
    db.add(Activity(
        lead_id=lead.id, activity_type="Call",
        description=f"AI voice call started ({call_provider.title()} {call_id_str or '?'})",
        created_by=me.id,
    ))
    db.commit()
    db.refresh(call)
    return PlaceCallOut(call_id=call.id, vapi_call_id=call_id_str,
                        status=resp.get("status", "queued"), raw=resp)


@router.post("/omnidim-webhook")
async def omnidim_webhook(req: Request, db: Session = Depends(get_db)):
    """OmniDimension post-call webhook receiver."""
    try:
        body = await req.json()
    except Exception:
        body = {}
    logger.info("Received OmniDimension webhook payload: %s", body)
    
    metadata = body.get("metadata") or {}
    lead_id = metadata.get("crm_lead_id") or body.get("crm_lead_id")
    request_id = str(body.get("requestId") or body.get("call_id") or body.get("id") or "")
    
    transcript = body.get("transcript") or body.get("full_conversation") or ""
    summary = body.get("summary") or body.get("call_summary") or ""
    sentiment = body.get("sentiment") or "Neutral"
    duration = int(body.get("duration") or body.get("call_duration") or 0)
    
    call = None
    if request_id:
        call = db.query(Call).filter(Call.vapi_call_id == request_id).first()
    if not call and lead_id:
        try:
            call = db.query(Call).filter(Call.lead_id == int(lead_id)).order_by(Call.id.desc()).first()
        except Exception:
            pass
        
    if call:
        call.call_status = "Completed"
        if duration:
            call.call_duration = duration
        if summary:
            call.call_summary = summary
        if transcript:
            call.transcript = transcript
        if sentiment:
            call.sentiment = sentiment.capitalize()
            
        db.add(AIAgentLog(
            lead_id=call.lead_id,
            conversation_summary=call.call_summary or "OmniDimension AI voice call completed.",
            sentiment=call.sentiment or "Neutral",
            next_action=body.get("next_action") or "Follow up with customer",
        ))
        db.commit()
        
        # Auto-extract appointment & update budget
        _process_appointment_extraction(db, call.lead_id, call.transcript or "", call.call_summary or "")
        
    return {"ok": True}


def _determine_outcome(summary: str, transcript: str) -> str:
    text = ((summary or "") + " " + (transcript or "")).lower()
    if "appointment" in text or "visit" in text or "showroom" in text:
        return "Appointment Booked"
    elif "quote" in text or "quotation" in text or "price" in text:
        return "Quotation Requested"
    elif "not interested" in text or "remove my number" in text or "don't call" in text:
        return "Not Interested"
    elif "bridal" in text or "wedding" in text:
        return "Bridal Inquiry"
    elif "diamond" in text or "solitaire" in text:
        return "Diamond Purchase"
    elif "exchange" in text or "old gold" in text:
        return "Exchange Inquiry"
    elif "investment" in text or "digital gold" in text or "coin" in text:
        return "Investment Gold"
    elif "gold" in text:
        return "Gold Purchase"
    return "Not Interested"


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
        # Check if it is a CampaignTarget call!
        from models import CampaignTarget, Campaign
        from services.campaign_dialer import CallResult
        from services.campaign_engine import _apply_outcome

        tgt = db.query(CampaignTarget).filter(CampaignTarget.vapi_call_id == vapi_id).first()
        if not tgt:
            logger.info("Unknown vapi call id %s — skipping", vapi_id)
            return {"ok": True, "ignored": "unknown call"}

        campaign = db.query(Campaign).filter(Campaign.id == tgt.campaign_id).first()
        if not campaign:
            return {"ok": True, "ignored": "campaign not found"}

        if msg_type == "status-update":
            status = msg.get("status") or "Updated"
            tgt.call_status = "completed" if status == "ended" else "dialing"
        elif msg_type == "end-of-call-report":
            duration = int(msg.get("durationSeconds") or msg.get("duration") or 0)
            transcript = msg.get("transcript") or ""
            summary = msg.get("summary") or ""
            analysis = msg.get("analysis") or {}
            sentiment = (analysis.get("sentiment") or "Neutral").capitalize()
            if sentiment not in ("Positive", "Neutral", "Negative"):
                sentiment = "Neutral"

            outcome = _determine_outcome(summary, transcript)
            lead_score = int(analysis.get("leadScore") or analysis.get("score") or 50)
            next_action = analysis.get("successEvaluation") or analysis.get("nextAction") or "Follow up"

            result = CallResult(
                final_status="completed",
                duration=duration,
                outcome=outcome,
                sentiment=sentiment,
                summary=summary,
                transcript=transcript,
                lead_score=lead_score,
                next_action=next_action,
                recording_url=call_info.get("recordingUrl") or msg.get("recordingUrl"),
                call_cost=float(msg.get("cost") or 0.0),
                callback_requested=("callback" in (next_action or "").lower()),
                vapi_call_id=vapi_id,
            )
            _apply_outcome(db, campaign, tgt, result)
            _process_appointment_extraction(db, tgt.lead_id, transcript, summary)
        db.commit()
        return {"ok": True}

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
        # Extract and create appointment if any
        _process_appointment_extraction(db, call.lead_id, call.transcript or "", call.call_summary or "")
    db.commit()
    return {"ok": True}


def _process_appointment_extraction(db: Session, lead_id: int, transcript: str, summary: str):
    """Call LLM to extract appointment and budget details, then persist to DB."""
    if not transcript and not summary:
        return
    
    try:
        from datetime import datetime
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        prompt = (
            "Analyze the following call transcript and summary to determine if the customer wants to schedule an appointment/meeting. "
            "Also extract their budget if mentioned.\n\n"
            f"Current local time: {now_str}\n\n"
            f"Call Summary: {summary}\n"
            f"Call Transcript: {transcript}\n\n"
            "Respond ONLY with a JSON object containing:\n"
            "- has_appointment: boolean (true if they agreed to a meeting/appointment time/day)\n"
            "- appointment_date: string in YYYY-MM-DD HH:MM:SS format (estimate date/time based on the day they mentioned relative to the current local time; default to null if not clear or not scheduled)\n"
            "- budget: integer (the budget mentioned by customer, or null)\n"
            "- showroom_visit: boolean (true if meeting at showroom/office, false if virtual/call/online)\n"
            "- notes: string summary of their requirement details, budget, and day/time preferences"
        )
        from services import llm
        data = llm.chat_json([
            {"role": "system", "content": "You are a CRM data extraction specialist. Always return valid JSON."},
            {"role": "user", "content": prompt}
        ], temperature=0.1)

        logger.info("Extracted appointment details from call: %s", data)
        
        if data.get("has_appointment") and data.get("appointment_date"):
            try:
                appt_dt = datetime.strptime(data["appointment_date"], "%Y-%m-%d %H:%M:%S")
                from models import Lead, Appointment
                lead = db.query(Lead).filter(Lead.id == lead_id).first()
                if lead:
                    appt = Appointment(
                        customer_name=lead.name,
                        lead_id=lead.id,
                        appointment_date=appt_dt,
                        showroom_visit=data.get("showroom_visit", True),
                        notes=data.get("notes", "")
                    )
                    db.add(appt)
                    
                    # Also update lead budget if extracted
                    if data.get("budget") and isinstance(data["budget"], (int, float)) and data["budget"] > 0:
                        lead.budget = float(data["budget"])
                        
                    db.commit()
                    logger.info("Successfully created appointment for lead %s via AI voice call sync.", lead_id)
            except Exception as ex:
                logger.error("Failed to parse and save extracted appointment: %s", ex)
    except Exception as e:
        logger.error("Failed to run LLM extraction for call: %s", e)
