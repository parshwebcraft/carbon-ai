from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Call, User
from schemas import CallCreate, CallUpdate, CallOut
from deps import get_current_user

router = APIRouter(prefix="/calls", tags=["calls"])


@router.get("", response_model=List[CallOut])
def list_calls(lead_id: Optional[int] = None, db: Session = Depends(get_db),
               _: User = Depends(get_current_user)):
    q = db.query(Call)
    if lead_id is not None:
        q = q.filter(Call.lead_id == lead_id)
    return [CallOut.model_validate(i) for i in q.order_by(Call.created_at.desc()).all()]


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
