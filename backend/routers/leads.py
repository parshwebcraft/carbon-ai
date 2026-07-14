from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database import get_db
from models import Lead, User, LeadInsight
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
    leads = (q.order_by(Lead.created_at.desc())
              .offset((page - 1) * page_size).limit(page_size).all())

    # Enrich with AI scores from LeadInsight
    lead_ids = [l.id for l in leads]
    insights = (db.query(LeadInsight)
                  .filter(LeadInsight.lead_id.in_(lead_ids))
                  .all()) if lead_ids else []
    insight_map = {ins.lead_id: ins for ins in insights}

    items = []
    for lead in leads:
        out = LeadOut.model_validate(lead)
        if lead.id in insight_map:
            ins = insight_map[lead.id]
            out.lead_score = ins.lead_score
            out.intent = ins.intent
        items.append(out)

    return LeadListOut(items=items, total=total, page=page, page_size=page_size)


@router.get("/{lead_id}", response_model=LeadOut)
def get_lead(lead_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    out = LeadOut.model_validate(lead)
    ins = db.query(LeadInsight).filter(LeadInsight.lead_id == lead_id).first()
    if ins:
        out.lead_score = ins.lead_score
        out.intent = ins.intent
    return out


import logging
from services.automation_engine import trigger_automation

logger = logging.getLogger("facets.leads")


@router.post("", response_model=LeadOut, status_code=201)
def create_lead(payload: LeadCreate, db: Session = Depends(get_db),
                _: User = Depends(get_current_user)):
    lead = Lead(**payload.model_dump(exclude_unset=True))
    db.add(lead)
    db.commit()
    db.refresh(lead)
    try:
        trigger_automation(db, "lead_created", lead.id)
    except Exception as e:
        logger.error("Failed to trigger lead_created automation: %s", e)
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


@router.post("/delete-multiple", status_code=204)
def delete_multiple_leads(lead_ids: list[int], db: Session = Depends(get_db),
                          _: User = Depends(require_roles("Admin", "Manager"))):
    db.query(Lead).filter(Lead.id.in_(lead_ids)).delete(synchronize_session=False)
    db.commit()
    return None


@router.post("/delete-all", status_code=204)
def delete_all_leads(db: Session = Depends(get_db),
                     _: User = Depends(require_roles("Admin", "Manager"))):
    db.query(Lead).delete(synchronize_session=False)
    db.commit()
    return None
