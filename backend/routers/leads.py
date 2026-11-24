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
    current_user: User = Depends(get_current_user),
):
    q = db.query(Lead)
    if current_user.company_id:
        q = q.filter(Lead.company_id == current_user.company_id)
    else:
        return LeadListOut(items=[], total=0, page=page, page_size=page_size)

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
def get_lead(lead_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Lead).filter(Lead.id == lead_id)
    if current_user.company_id and current_user.role != "SuperAdmin":
        q = q.filter(Lead.company_id == current_user.company_id)
    lead = q.first()
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
                current_user: User = Depends(get_current_user)):
    lead_dict = payload.model_dump(exclude_unset=True)
    if current_user.company_id:
        lead_dict["company_id"] = current_user.company_id
    for field in ["email", "phone", "city", "company", "notes", "customer_type"]:
        if field in lead_dict and isinstance(lead_dict[field], str) and not lead_dict[field].strip():
            lead_dict[field] = None
    lead = Lead(**lead_dict)
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
                current_user: User = Depends(get_current_user)):
    q = db.query(Lead).filter(Lead.id == lead_id)
    if current_user.company_id and current_user.role != "SuperAdmin":
        q = q.filter(Lead.company_id == current_user.company_id)
    lead = q.first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        if isinstance(v, str) and not v.strip() and k in ["email", "phone", "city", "company", "notes", "customer_type"]:
            v = None
        setattr(lead, k, v)
    db.commit()
    db.refresh(lead)
    return LeadOut.model_validate(lead)


def _delete_leads_safely(db: Session, lead_ids: list[int]):
    if not lead_ids:
        return
    import models

    fk_mappings = [
        (models.Activity, models.Activity.lead_id),
        (models.Call, models.Call.lead_id),
        (models.Task, models.Task.lead_id),
        (models.WhatsappMessage, models.WhatsappMessage.lead_id),
        (models.Appointment, models.Appointment.lead_id),
        (models.Quotation, models.Quotation.lead_id),
        (models.AIAgentLog, models.AIAgentLog.lead_id),
        (models.LeadInsight, models.LeadInsight.lead_id),
        (models.CampaignTarget, models.CampaignTarget.lead_id),
        (models.CopilotSession, models.CopilotSession.lead_id),
        (models.ConversationMemory, models.ConversationMemory.customer_id),
        (models.AICallIntelligence, models.AICallIntelligence.lead_id),
        (models.CustomerConversationMemory, models.CustomerConversationMemory.lead_id),
    ]
    for model_cls, col in fk_mappings:
        try:
            db.query(model_cls).filter(col.in_(lead_ids)).delete(synchronize_session=False)
        except Exception:
            pass

    db.query(models.Lead).filter(models.Lead.id.in_(lead_ids)).delete(synchronize_session=False)
    db.commit()


@router.delete("/{lead_id}", status_code=204)
def delete_lead(lead_id: int, db: Session = Depends(get_db),
                current_user: User = Depends(require_roles("Admin", "Manager"))):
    q = db.query(Lead).filter(Lead.id == lead_id)
    if current_user.company_id and current_user.role != "SuperAdmin":
        q = q.filter(Lead.company_id == current_user.company_id)
    lead = q.first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    _delete_leads_safely(db, [lead_id])
    return None


@router.post("/delete-multiple", status_code=204)
def delete_multiple_leads(lead_ids: list[int], db: Session = Depends(get_db),
                          current_user: User = Depends(require_roles("Admin", "Manager"))):
    q = db.query(Lead.id).filter(Lead.id.in_(lead_ids))
    if current_user.company_id and current_user.role != "SuperAdmin":
        q = q.filter(Lead.company_id == current_user.company_id)
    allowed_ids = [r[0] for r in q.all()]
    _delete_leads_safely(db, allowed_ids)
    return None


@router.post("/delete-all", status_code=204)
def delete_all_leads(db: Session = Depends(get_db),
                     current_user: User = Depends(require_roles("Admin", "Manager"))):
    q = db.query(Lead.id)
    if current_user.company_id and current_user.role != "SuperAdmin":
        q = q.filter(Lead.company_id == current_user.company_id)
    all_ids = [r[0] for r in q.all()]
    _delete_leads_safely(db, all_ids)
    return None


@router.post("/{lead_id}/toggle-drip")
def toggle_lead_drip(lead_id: int, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    q = db.query(Lead).filter(Lead.id == lead_id)
    if current_user.company_id and current_user.role != "SuperAdmin":
        q = q.filter(Lead.company_id == current_user.company_id)
    lead = q.first()
    if not lead:
        raise HTTPException(404, "Lead not found")

    cur_status = getattr(lead, "drip_status", "active") or "active"
    if cur_status == "active":
        lead.drip_status = "paused"
    elif cur_status == "paused":
        lead.drip_status = "active"
    else:
        # If stopped or completed, restarting reactivates drip at step 0
        lead.drip_status = "active"
        lead.drip_step = 0

    db.commit()
    db.refresh(lead)
    return {
        "ok": True,
        "lead_id": lead.id,
        "drip_status": lead.drip_status,
        "drip_step": lead.drip_step,
        "last_drip_sent_at": lead.last_drip_sent_at.isoformat() if lead.last_drip_sent_at else None
    }


@router.post("/drip/run-now")
def trigger_drip_run_now(db: Session = Depends(get_db),
                         current_user: User = Depends(require_roles("Admin", "Manager"))):
    from services.scheduler import run_drip_cycle_sync
    dispatched = run_drip_cycle_sync()
    return {"ok": True, "dispatched_count": dispatched}


