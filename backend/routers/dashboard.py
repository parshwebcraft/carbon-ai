from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Lead, Task, Call, Appointment, User, LeadInsight
from schemas import DashboardStats
from deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cid = current_user.company_id
    if not cid:
        return DashboardStats(
            total_leads=0, new_leads=0, won_leads=0, lost_leads=0,
            open_tasks=0, completed_tasks=0, total_calls=0, total_appointments=0,
            pipeline_value=0.0, won_value=0.0, lead_status_distribution={},
            lead_source_distribution={}, task_completion_rate=0.0, hot_leads=[],
            revenue_at_risk=0.0, conversion_forecast=0.0,
        )

    total_leads = db.query(func.count(Lead.id)).filter(Lead.company_id == cid).scalar() or 0
    new_leads = db.query(func.count(Lead.id)).filter(Lead.company_id == cid, Lead.status == "New").scalar() or 0
    won_leads = db.query(func.count(Lead.id)).filter(Lead.company_id == cid, Lead.status == "Won").scalar() or 0
    lost_leads = db.query(func.count(Lead.id)).filter(Lead.company_id == cid, Lead.status == "Lost").scalar() or 0

    open_tasks = db.query(func.count(Task.id)).filter(Task.company_id == cid, Task.status.in_(["Open", "In Progress"])).scalar() or 0
    completed_tasks = db.query(func.count(Task.id)).filter(Task.company_id == cid, Task.status == "Completed").scalar() or 0
    total_tasks = db.query(func.count(Task.id)).filter(Task.company_id == cid).scalar() or 0

    total_calls = db.query(func.count(Call.id)).filter(Call.company_id == cid).scalar() or 0
    total_appointments = db.query(func.count(Appointment.id)).filter(Appointment.company_id == cid).scalar() or 0

    pipeline_value = (db.query(func.coalesce(func.sum(Lead.budget), 0.0))
                        .filter(Lead.company_id == cid, Lead.status.notin_(["Won", "Lost"])).scalar() or 0.0)
    won_value = (db.query(func.coalesce(func.sum(Lead.budget), 0.0))
                   .filter(Lead.company_id == cid, Lead.status == "Won").scalar() or 0.0)

    status_rows = (db.query(Lead.status, func.count(Lead.id))
                     .filter(Lead.company_id == cid)
                     .group_by(Lead.status).all())
    source_rows = (db.query(Lead.source, func.count(Lead.id))
                     .filter(Lead.company_id == cid)
                     .group_by(Lead.source).all())

    completion_rate = (completed_tasks / total_tasks * 100.0) if total_tasks else 0.0

    # ── AI enrichment ────────────────────────────────────────────────────────
    # Hot leads: top 5 by lead_score with score ≥ 75
    hot_leads_rows = (
        db.query(LeadInsight, Lead)
        .join(Lead, LeadInsight.lead_id == Lead.id)
        .filter(Lead.company_id == cid, LeadInsight.lead_score >= 75)
        .order_by(LeadInsight.lead_score.desc())
        .limit(5).all()
    )
    hot_leads = [
        {
            "lead_id": ins.lead_id,
            "name": lead.name,
            "status": lead.status,
            "city": lead.city,
            "budget": lead.budget,
            "lead_score": ins.lead_score,
            "intent": ins.intent,
        }
        for ins, lead in hot_leads_rows
    ]

    # Revenue at risk: leads with budget > 50k, not won/lost, no activity in 14 days
    stale_cutoff = datetime.utcnow() - timedelta(days=14)
    revenue_at_risk = float(
        db.query(func.coalesce(func.sum(Lead.budget), 0.0))
        .filter(
            Lead.company_id == cid,
            Lead.status.notin_(["Won", "Lost"]),
            Lead.budget > 50000,
            Lead.updated_at < stale_cutoff,
        ).scalar() or 0.0
    )

    # Conversion forecast: % of active leads with score >= 60
    lead_ids_sub = db.query(Lead.id).filter(Lead.company_id == cid).subquery()
    scored_leads = db.query(func.count(LeadInsight.id)).filter(LeadInsight.lead_id.in_(lead_ids_sub)).scalar() or 0
    likely_close = db.query(func.count(LeadInsight.id)).filter(LeadInsight.lead_id.in_(lead_ids_sub), LeadInsight.lead_score >= 60).scalar() or 0
    conversion_forecast = round((likely_close / scored_leads * 100.0) if scored_leads else 0.0, 1)

    return DashboardStats(
        total_leads=total_leads,
        new_leads=new_leads,
        won_leads=won_leads,
        lost_leads=lost_leads,
        open_tasks=open_tasks,
        completed_tasks=completed_tasks,
        total_calls=total_calls,
        total_appointments=total_appointments,
        pipeline_value=float(pipeline_value),
        won_value=float(won_value),
        lead_status_distribution={k or "Unknown": v for k, v in status_rows},
        lead_source_distribution={k or "Unknown": v for k, v in source_rows},
        task_completion_rate=round(completion_rate, 2),
        hot_leads=hot_leads,
        revenue_at_risk=revenue_at_risk,
        conversion_forecast=conversion_forecast,
    )


@router.get("/ai-summary")
def ai_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """LLM-generated morning briefing based on current pipeline stats."""
    from services import llm

    cid = current_user.company_id
    if not cid:
        return {
            "briefing": "Welcome to your new workspace! Upload your first leads or launch an AI calling campaign to get started.",
            "stats": {"total_leads": 0, "open_tasks": 0, "pipeline_value": 0.0, "won_value": 0.0}
        }

    total_leads = db.query(func.count(Lead.id)).filter(Lead.company_id == cid).scalar() or 0
    new_leads = db.query(func.count(Lead.id)).filter(Lead.company_id == cid, Lead.status == "New").scalar() or 0
    open_tasks = db.query(func.count(Task.id)).filter(Task.company_id == cid, Task.status.in_(["Open", "In Progress"])).scalar() or 0
    pipeline_value = float(db.query(func.coalesce(func.sum(Lead.budget), 0.0))
                             .filter(Lead.company_id == cid, Lead.status.notin_(["Won", "Lost"])).scalar() or 0.0)
    won_value = float(db.query(func.coalesce(func.sum(Lead.budget), 0.0))
                        .filter(Lead.company_id == cid, Lead.status == "Won").scalar() or 0.0)
    completed_tasks = db.query(func.count(Task.id)).filter(Task.company_id == cid, Task.status == "Completed").scalar() or 0
    total_tasks = db.query(func.count(Task.id)).filter(Task.company_id == cid).scalar() or 0
    completion_rate = round((completed_tasks / total_tasks * 100.0) if total_tasks else 0.0, 1)

    lead_ids_sub = db.query(Lead.id).filter(Lead.company_id == cid).subquery()
    hot_lead_count = db.query(func.count(LeadInsight.id)).filter(LeadInsight.lead_id.in_(lead_ids_sub), LeadInsight.lead_score >= 75).scalar() or 0

    stale_cutoff = datetime.utcnow() - timedelta(days=7)
    stale_count = (db.query(func.count(Lead.id))
                     .filter(Lead.company_id == cid, Lead.status.notin_(["Won", "Lost"]), Lead.updated_at < stale_cutoff)
                     .scalar() or 0)

    stats_dict = {
        "total_leads": total_leads,
        "new_leads": new_leads,
        "open_tasks": open_tasks,
        "pipeline_value": pipeline_value,
        "won_value": won_value,
        "task_completion_rate": completion_rate,
        "hot_lead_count": hot_lead_count,
        "stale_lead_count": stale_count,
    }

    if total_leads == 0:
        return {
            "briefing": "Welcome to your new workspace! Upload your first leads or launch an AI calling campaign to get started.",
            "stats": stats_dict
        }

    try:
        briefing = llm.dashboard_briefing(stats_dict)
    except Exception:
        briefing = f"Good morning! You have {total_leads} leads in your pipeline worth ₹{int(pipeline_value):,}."

    return {"briefing": briefing, "stats": stats_dict}
