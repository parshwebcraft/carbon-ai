from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Call, Lead, LeadInsight, User
from schemas import CallCreate, CallUpdate, CallOut
from deps import get_current_user

router = APIRouter(prefix="/calls", tags=["calls"])


@router.get("")
def list_calls(lead_id: Optional[int] = None, db: Session = Depends(get_db),
               _: User = Depends(get_current_user)):
    """Return calls enriched with lead name + AI score from LeadInsight."""
    q = db.query(Call)
    if lead_id is not None:
        q = q.filter(Call.lead_id == lead_id)
    calls = q.order_by(Call.created_at.desc()).all()

    result = []
    for c in calls:
        lead = db.query(Lead).filter(Lead.id == c.lead_id).first()
        insight = db.query(LeadInsight).filter(LeadInsight.lead_id == c.lead_id).first() if c.lead_id else None
        result.append({
            "id": c.id,
            "lead_id": c.lead_id,
            "lead_name": lead.name if lead else f"Lead #{c.lead_id}",
            "lead_score": insight.lead_score if insight else None,
            "call_duration": c.call_duration,
            "call_status": c.call_status,
            "call_summary": c.call_summary,
            "transcript": c.transcript,
            "sentiment": c.sentiment,
            "vapi_call_id": c.vapi_call_id,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })
    return result


@router.get("/{call_id}", response_model=CallOut)
def get_call(call_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    c = db.query(Call).filter(Call.id == call_id).first()
    if not c:
        raise HTTPException(404, "Call not found")
    return CallOut.model_validate(c)


@router.post("", response_model=CallOut, status_code=201)
def create_call(payload: CallCreate, db: Session = Depends(get_db),
                _: User = Depends(get_current_user)):
    c = Call(**payload.model_dump(exclude_unset=True))
    db.add(c)
    db.commit()
    db.refresh(c)
    return CallOut.model_validate(c)


@router.put("/{call_id}", response_model=CallOut)
def update_call(call_id: int, payload: CallUpdate, db: Session = Depends(get_db),
                _: User = Depends(get_current_user)):
    c = db.query(Call).filter(Call.id == call_id).first()
    if not c:
        raise HTTPException(404, "Call not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return CallOut.model_validate(c)


@router.delete("/{call_id}", status_code=204)
def delete_call(call_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    c = db.query(Call).filter(Call.id == call_id).first()
    if not c:
        raise HTTPException(404, "Call not found")
    db.delete(c)
    db.commit()
    return None
