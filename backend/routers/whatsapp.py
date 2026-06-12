from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import WhatsappMessage, Lead, User
from schemas import WhatsappCreate, WhatsappOut
from deps import get_current_user

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


@router.get("/conversations")
def list_conversations(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    # group by lead_id with last message
    rows = (
        db.query(
            WhatsappMessage.lead_id,
            func.max(WhatsappMessage.created_at).label("last_at"),
            func.count(WhatsappMessage.id).label("count"),
        )
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
        result.append({
            "lead_id": lead_id,
            "lead_name": lead.name if lead else f"Lead #{lead_id}",
            "lead_phone": lead.phone if lead else None,
            "last_message": last_msg.message if last_msg else "",
            "last_direction": last_msg.direction if last_msg else "in",
            "last_at": last_at,
            "count": count,
        })
    return result


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
