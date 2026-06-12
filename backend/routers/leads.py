from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database import get_db
from models import Lead, User
from schemas import LeadCreate, LeadUpdate, LeadOut, LeadListOut
from deps import get_current_user, require_roles

router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("", response_model=LeadListOut)
def list_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    search: Optional[str] = None,
    status: Optional[str] = None,
    source: Optional[str] = None,
    assigned_to: Optional[int] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Lead)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(Lead.name.ilike(like), Lead.email.ilike(like),
                         Lead.phone.ilike(like), Lead.company.ilike(like)))
    if status:
        q = q.filter(Lead.status == status)
    if source:
        q = q.filter(Lead.source == source)
    if assigned_to is not None:
        q = q.filter(Lead.assigned_to == assigned_to)

    total = q.count()
    items = (q.order_by(Lead.created_at.desc())
              .offset((page - 1) * page_size).limit(page_size).all())
    return LeadListOut(
        items=[LeadOut.model_validate(i) for i in items],
        total=total, page=page, page_size=page_size,
    )


@router.get("/{lead_id}", response_model=LeadOut)
def get_lead(lead_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    return LeadOut.model_validate(lead)


@router.post("", response_model=LeadOut, status_code=201)
def create_lead(payload: LeadCreate, db: Session = Depends(get_db),
                _: User = Depends(get_current_user)):
    lead = Lead(**payload.model_dump(exclude_unset=True))
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return LeadOut.model_validate(lead)


@router.put("/{lead_id}", response_model=LeadOut)
def update_lead(lead_id: int, payload: LeadUpdate, db: Session = Depends(get_db),
                _: User = Depends(get_current_user)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(lead, k, v)
    db.commit()
    db.refresh(lead)
    return LeadOut.model_validate(lead)


@router.delete("/{lead_id}", status_code=204)
def delete_lead(lead_id: int, db: Session = Depends(get_db),
                _: User = Depends(require_roles("Admin", "Manager"))):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    db.delete(lead)
    db.commit()
    return None
