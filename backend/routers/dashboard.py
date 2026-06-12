from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Lead, Task, Call, Appointment, User
from schemas import DashboardStats
from deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def stats(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    total_leads = db.query(func.count(Lead.id)).scalar() or 0
    new_leads = db.query(func.count(Lead.id)).filter(Lead.status == "New").scalar() or 0
    won_leads = db.query(func.count(Lead.id)).filter(Lead.status == "Won").scalar() or 0
    lost_leads = db.query(func.count(Lead.id)).filter(Lead.status == "Lost").scalar() or 0

    open_tasks = db.query(func.count(Task.id)).filter(Task.status.in_(["Open", "In Progress"])).scalar() or 0
    completed_tasks = db.query(func.count(Task.id)).filter(Task.status == "Completed").scalar() or 0
    total_tasks = db.query(func.count(Task.id)).scalar() or 0

    total_calls = db.query(func.count(Call.id)).scalar() or 0
    total_appointments = db.query(func.count(Appointment.id)).scalar() or 0

    pipeline_value = (db.query(func.coalesce(func.sum(Lead.budget), 0.0))
                        .filter(Lead.status.notin_(["Won", "Lost"])).scalar() or 0.0)
    won_value = (db.query(func.coalesce(func.sum(Lead.budget), 0.0))
                   .filter(Lead.status == "Won").scalar() or 0.0)

    status_rows = (db.query(Lead.status, func.count(Lead.id))
                     .group_by(Lead.status).all())
    source_rows = (db.query(Lead.source, func.count(Lead.id))
                     .group_by(Lead.source).all())

    completion_rate = (completed_tasks / total_tasks * 100.0) if total_tasks else 0.0

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
    )
