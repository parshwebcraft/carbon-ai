from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import AIAgentLog, User
from schemas import AILogCreate, AILogOut
from deps import get_current_user

router = APIRouter(prefix="/ai-logs", tags=["ai-logs"])


@router.get("", response_model=List[AILogOut])
def list_logs(lead_id: Optional[int] = None, db: Session = Depends(get_db),
              _: User = Depends(get_current_user)):
    q = db.query(AIAgentLog)
    if lead_id is not None:
        q = q.filter(AIAgentLog.lead_id == lead_id)
    return [AILogOut.model_validate(log) for log in q.order_by(AIAgentLog.created_at.desc()).all()]


@router.post("", response_model=AILogOut, status_code=201)
def create_log(payload: AILogCreate, db: Session = Depends(get_db),
               _: User = Depends(get_current_user)):
    l_obj = AIAgentLog(**payload.model_dump())
    db.add(l_obj)
    db.commit()
    db.refresh(l_obj)
    return AILogOut.model_validate(l_obj)


@router.delete("/{lid}", status_code=204)
def delete_log(lid: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    l_obj = db.query(AIAgentLog).filter(AIAgentLog.id == lid).first()
    if not l_obj:
        raise HTTPException(404, "Log not found")
    db.delete(l_obj)
    db.commit()
    return None
