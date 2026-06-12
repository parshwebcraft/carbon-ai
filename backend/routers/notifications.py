from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Notification, User
from schemas import NotificationOut
from deps import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=List[NotificationOut])
def list_notifications(db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    items = (db.query(Notification)
               .filter(Notification.user_id == me.id)
               .order_by(Notification.created_at.desc()).all())
    return [NotificationOut.model_validate(n) for n in items]


@router.post("/{nid}/read", response_model=NotificationOut)
def mark_read(nid: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    n = (db.query(Notification)
           .filter(Notification.id == nid, Notification.user_id == me.id).first())
    if not n:
        raise HTTPException(404, "Notification not found")
    n.is_read = True
    db.commit()
    db.refresh(n)
    return NotificationOut.model_validate(n)


@router.post("/read-all")
def mark_all_read(db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    db.query(Notification).filter(Notification.user_id == me.id,
                                  ~Notification.is_read).update({"is_read": True})
    db.commit()
    return {"ok": True}
