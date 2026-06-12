from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Activity, User
from schemas import ActivityCreate, ActivityOut
from deps import get_current_user

router = APIRouter(prefix="/activities", tags=["activities"])


@router.get("", response_model=List[ActivityOut])
def list_activities(lead_id: Optional[int] = None, db: Session = Depends(get_db),
                    _: User = Depends(get_current_user)):
    q = db.query(Activity)
    if lead_id is not None:
        q = q.filter(Activity.lead_id == lead_id)
    return [ActivityOut.model_validate(a) for a in q.order_by(Activity.created_at.desc()).all()]


@router.post("", response_model=ActivityOut, status_code=201)
def create_activity(payload: ActivityCreate, db: Session = Depends(get_db),
                    me: User = Depends(get_current_user)):
    a = Activity(**payload.model_dump(), created_by=me.id)
    db.add(a)
    db.commit()
    db.refresh(a)
    return ActivityOut.model_validate(a)


@router.delete("/{activity_id}", status_code=204)
def delete_activity(activity_id: int, db: Session = Depends(get_db),
                    _: User = Depends(get_current_user)):
    a = db.query(Activity).filter(Activity.id == activity_id).first()
    if not a:
        raise HTTPException(404, "Activity not found")
    db.delete(a)
    db.commit()
    return None
