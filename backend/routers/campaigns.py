"""Outbound AI calling campaign API."""
from __future__ import annotations

import csv
import io
import json
import logging
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from database import get_db
from deps import get_current_user, require_roles
from models import Campaign, CampaignTarget, Lead, User
from schemas import (
    CampaignCreate, CampaignUpdate, CampaignOut, CampaignListOut,
    CampaignStats, CampaignTargetOut, CampaignTargetListOut,
    CampaignPreviewOut, LeadFilterSpec,
)
from services import campaign_dialer, campaign_engine

logger = logging.getLogger("facets.campaigns")
router = APIRouter(prefix="/campaigns", tags=["campaigns"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _filter_leads_query(db: Session, spec: LeadFilterSpec):
    q = db.query(Lead).filter(Lead.phone.isnot(None), Lead.phone != "")
    if spec.lead_ids:
        return db.query(Lead).filter(Lead.id.in_(spec.lead_ids),
                                     Lead.phone.isnot(None), Lead.phone != "")
    if spec.status:
        q = q.filter(Lead.status.in_(spec.status))
    if spec.source:
        q = q.filter(Lead.source.in_(spec.source))
    if spec.assigned_to:
        q = q.filter(Lead.assigned_to.in_(spec.assigned_to))
    if spec.city:
        q = q.filter(Lead.city.in_(spec.city))
    return q


def _stats(db: Session, campaign_id: int) -> CampaignStats:
    rows = (db.query(CampaignTarget.call_status, func.count(CampaignTarget.id))
            .filter(CampaignTarget.campaign_id == campaign_id)
            .group_by(CampaignTarget.call_status).all())
    by_status = {s: c for s, c in rows}
    total = sum(by_status.values())
    in_progress = (by_status.get("queued", 0) + by_status.get("dialing", 0)
                   + by_status.get("ringing", 0))
    connected = by_status.get("completed", 0)

    outcomes_rows = (db.query(CampaignTarget.outcome, func.count(CampaignTarget.id))
                     .filter(CampaignTarget.campaign_id == campaign_id,
                             CampaignTarget.outcome.isnot(None))
                     .group_by(CampaignTarget.outcome).all())
    outcomes = {o: c for o, c in outcomes_rows}
    sentiment_rows = (db.query(CampaignTarget.sentiment, func.count(CampaignTarget.id))
                      .filter(CampaignTarget.campaign_id == campaign_id,
                              CampaignTarget.sentiment.isnot(None))
                      .group_by(CampaignTarget.sentiment).all())
    sentiment = {s: c for s, c in sentiment_rows}

    interested = sum(outcomes.get(k, 0) for k in (
        "Bridal Inquiry", "Gold Purchase", "Diamond Purchase",
        "Exchange Inquiry", "Investment Gold",
    ))
    appts = outcomes.get("Appointment Booked", 0)
    quotes = outcomes.get("Quotation Requested", 0)
    conv = (interested + appts + quotes) / connected if connected else 0.0

    avg_score = (db.query(func.avg(CampaignTarget.lead_score))
                 .filter(CampaignTarget.campaign_id == campaign_id,
                         CampaignTarget.lead_score.isnot(None)).scalar()) or 0.0

    return CampaignStats(
        total_targets=total,
        pending=by_status.get("pending", 0),
        in_progress=in_progress,
        completed=connected,
        failed=by_status.get("failed", 0),
        busy=by_status.get("busy", 0),
        no_answer=by_status.get("no_answer", 0),
        connected=connected,
        interested_leads=interested,
        appointment_bookings=appts,
        quotations_requested=quotes,
        conversion_rate=round(conv, 4),
        avg_lead_score=round(float(avg_score), 2),
        sentiment=sentiment,
        outcomes=outcomes,
    )


def _serialise(c: Campaign, db: Session) -> CampaignOut:
    out = CampaignOut.model_validate(c)
    out.stats = _stats(db, c.id)
    out.provider = campaign_dialer.provider_name(db)
    return out


def _materialise_targets(db: Session, campaign: Campaign, body: CampaignCreate) -> int:
    count = 0
    seen = set()  # dedupe by phone within the campaign
    if body.source_type in ("leads", "mixed") and body.filters:
        leads = _filter_leads_query(db, body.filters).all()
        for lead in leads:
            if not lead.phone or lead.phone in seen:
                continue
            seen.add(lead.phone)
            db.add(CampaignTarget(
                campaign_id=campaign.id,
                lead_id=lead.id,
                name=lead.name,
                phone=lead.phone,
                city=lead.city,
                notes=lead.notes,
                source=lead.source,
            ))
            count += 1
    if body.source_type in ("csv", "mixed") and body.csv_targets:
        for t in body.csv_targets:
            if not t.phone or t.phone in seen:
                continue
            seen.add(t.phone)
            # Best-effort link to existing lead by phone
            existing = db.query(Lead).filter(Lead.phone == t.phone).first()
            db.add(CampaignTarget(
                campaign_id=campaign.id,
                lead_id=existing.id if existing else None,
                name=t.name or (existing.name if existing else "Unknown"),
                phone=t.phone,
                city=t.city or (existing.city if existing else None),
                notes=t.notes,
                source=t.source or "Campaign CSV",
                lead_prompt_override=t.lead_prompt_override,
            ))
            count += 1
    db.commit()
    return count


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=CampaignListOut)
def list_campaigns(status: Optional[str] = None,
                   db: Session = Depends(get_db),
                   _: User = Depends(get_current_user)):
    q = db.query(Campaign)
    if status:
        q = q.filter(Campaign.status == status)
    items = q.order_by(Campaign.id.desc()).all()
    return CampaignListOut(items=[_serialise(c, db) for c in items], total=len(items))


@router.post("", response_model=CampaignOut)
def create_campaign(body: CampaignCreate,
                    db: Session = Depends(get_db),
                    me: User = Depends(require_roles("Admin", "Manager"))):
    if body.source_type not in ("leads", "csv", "mixed"):
        raise HTTPException(400, "source_type must be leads|csv|mixed")
    campaign = Campaign(
        name=body.name,
        description=body.description,
        status="draft",
        campaign_prompt=body.campaign_prompt,
        source_type=body.source_type,
        filters_json=json.dumps(body.filters.model_dump() if body.filters else {}),
        daily_call_limit=body.daily_call_limit,
        start_time=body.start_time,
        end_time=body.end_time,
        calls_per_minute=body.calls_per_minute,
        created_by=me.id,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    added = _materialise_targets(db, campaign, body)
    logger.info("Campaign %s created with %s targets", campaign.id, added)
    return _serialise(campaign, db)


@router.get("/{cid}", response_model=CampaignOut)
def get_campaign(cid: int, db: Session = Depends(get_db),
                 _: User = Depends(get_current_user)):
    c = db.query(Campaign).filter(Campaign.id == cid).first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    return _serialise(c, db)


@router.patch("/{cid}", response_model=CampaignOut)
def update_campaign(cid: int, body: CampaignUpdate,
                    db: Session = Depends(get_db),
                    _: User = Depends(require_roles("Admin", "Manager"))):
    c = db.query(Campaign).filter(Campaign.id == cid).first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    db.commit()
    return _serialise(c, db)


@router.delete("/{cid}")
def delete_campaign(cid: int, db: Session = Depends(get_db),
                    _: User = Depends(require_roles("Admin", "Manager"))):
    c = db.query(Campaign).filter(Campaign.id == cid).first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    db.delete(c)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

@router.post("/{cid}/launch", response_model=CampaignOut)
def launch_campaign(cid: int, db: Session = Depends(get_db),
                    _: User = Depends(require_roles("Admin", "Manager"))):
    c = db.query(Campaign).filter(Campaign.id == cid).first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    if c.status in ("running",):
        return _serialise(c, db)
    if c.status in ("completed", "cancelled"):
        raise HTTPException(400, f"Campaign is {c.status}; cannot relaunch.")
    pending = (db.query(func.count(CampaignTarget.id))
               .filter(CampaignTarget.campaign_id == c.id,
                       CampaignTarget.call_status == "pending").scalar() or 0)
    if pending == 0:
        raise HTTPException(400, "No pending targets to dial.")
    c.status = "running"
    c.started_at = c.started_at or datetime.now(timezone.utc)
    db.commit()
    return _serialise(c, db)


@router.post("/{cid}/pause", response_model=CampaignOut)
def pause_campaign(cid: int, db: Session = Depends(get_db),
                   _: User = Depends(require_roles("Admin", "Manager"))):
    c = db.query(Campaign).filter(Campaign.id == cid).first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    if c.status == "running":
        c.status = "paused"
        db.commit()
    return _serialise(c, db)


@router.post("/{cid}/resume", response_model=CampaignOut)
def resume_campaign(cid: int, db: Session = Depends(get_db),
                    _: User = Depends(require_roles("Admin", "Manager"))):
    c = db.query(Campaign).filter(Campaign.id == cid).first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    if c.status == "paused":
        c.status = "running"
        db.commit()
    return _serialise(c, db)


@router.post("/{cid}/cancel", response_model=CampaignOut)
def cancel_campaign(cid: int, db: Session = Depends(get_db),
                    _: User = Depends(require_roles("Admin", "Manager"))):
    c = db.query(Campaign).filter(Campaign.id == cid).first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    c.status = "cancelled"
    c.completed_at = datetime.now(timezone.utc)
    db.commit()
    return _serialise(c, db)


# ---------------------------------------------------------------------------
# Targets, CSV upload, preview, analytics, manual tick (test helper)
# ---------------------------------------------------------------------------

@router.get("/{cid}/targets", response_model=CampaignTargetListOut)
def list_targets(cid: int,
                 status: Optional[str] = None,
                 outcome: Optional[str] = None,
                 q: Optional[str] = None,
                 page: int = Query(1, ge=1),
                 page_size: int = Query(50, ge=1, le=500),
                 db: Session = Depends(get_db),
                 _: User = Depends(get_current_user)):
    qry = db.query(CampaignTarget).filter(CampaignTarget.campaign_id == cid)
    if status:
        qry = qry.filter(CampaignTarget.call_status == status)
    if outcome:
        qry = qry.filter(CampaignTarget.outcome == outcome)
    if q:
        like = f"%{q}%"
        qry = qry.filter((CampaignTarget.name.ilike(like))
                         | (CampaignTarget.phone.ilike(like)))
    total = qry.count()
    items = (qry.order_by(CampaignTarget.id.asc())
             .offset((page - 1) * page_size).limit(page_size).all())
    return CampaignTargetListOut(
        items=[CampaignTargetOut.model_validate(t) for t in items],
        total=total, page=page, page_size=page_size,
    )


@router.post("/{cid}/upload-csv", response_model=CampaignOut)
async def upload_csv(cid: int,
                     file: UploadFile = File(...),
                     db: Session = Depends(get_db),
                     _: User = Depends(require_roles("Admin", "Manager"))):
    c = db.query(Campaign).filter(Campaign.id == cid).first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    if c.status in ("completed", "cancelled"):
        raise HTTPException(400, f"Cannot upload to a {c.status} campaign.")
    raw = (await file.read()).decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(raw))
    existing_phones = {p for (p,) in db.query(CampaignTarget.phone)
                       .filter(CampaignTarget.campaign_id == cid).all()}
    added = 0
    for row in reader:
        phone = (row.get("phone") or row.get("Phone") or "").strip()
        name = (row.get("name") or row.get("Name") or "").strip()
        if not phone or phone in existing_phones:
            continue
        existing_phones.add(phone)
        # Link to existing lead if phone matches
        existing = db.query(Lead).filter(Lead.phone == phone).first()
        db.add(CampaignTarget(
            campaign_id=cid,
            lead_id=existing.id if existing else None,
            name=name or (existing.name if existing else "Unknown"),
            phone=phone,
            city=(row.get("city") or row.get("City") or
                  (existing.city if existing else None)) or None,
            notes=row.get("notes") or row.get("Notes"),
            source=row.get("source") or row.get("Source") or "Campaign CSV",
            lead_prompt_override=row.get("lead_prompt_override")
                or row.get("prompt") or row.get("Prompt"),
        ))
        added += 1
    if c.source_type == "leads" and added:
        c.source_type = "mixed"
    db.commit()
    logger.info("Campaign %s CSV upload: added %s targets", cid, added)
    return _serialise(c, db)


@router.post("/preview", response_model=CampaignPreviewOut)
def preview_filter(spec: LeadFilterSpec,
                   db: Session = Depends(get_db),
                   _: User = Depends(get_current_user)):
    leads = _filter_leads_query(db, spec).order_by(Lead.id.asc()).limit(2000).all()
    sample = [{
        "id": l.id, "name": l.name, "phone": l.phone, "city": l.city,
        "status": l.status, "source": l.source, "customer_type": l.customer_type,
    } for l in leads[:10]]
    return CampaignPreviewOut(total=len(leads), sample=sample)


@router.get("/{cid}/analytics")
def analytics(cid: int, db: Session = Depends(get_db),
              _: User = Depends(get_current_user)):
    c = db.query(Campaign).filter(Campaign.id == cid).first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    s = _stats(db, cid)
    payload = s.model_dump()
    payload["campaign"] = {
        "id": c.id, "name": c.name, "status": c.status,
        "provider": campaign_dialer.provider_name(db),
        "started_at": c.started_at, "completed_at": c.completed_at,
    }
    # Headline tiles
    payload["headline"] = {
        "total_calls": s.total_targets,
        "connected_calls": s.connected,
        "interested_leads": s.interested_leads,
        "appointment_bookings": s.appointment_bookings,
        "quotations_requested": s.quotations_requested,
        "conversion_rate_pct": round(s.conversion_rate * 100, 2),
        "avg_lead_score": s.avg_lead_score,
    }
    payload["sentiment_distribution"] = s.sentiment
    payload["outcome_distribution"] = s.outcomes
    return payload


@router.post("/{cid}/tick")
def manual_tick(cid: int, db: Session = Depends(get_db),
                _: User = Depends(require_roles("Admin", "Manager"))):
    """Force one engine pass — useful for tests and quick demos."""
    c = db.query(Campaign).filter(Campaign.id == cid).first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    result = campaign_engine.run_tick_sync()
    return {"ok": True, **result}
