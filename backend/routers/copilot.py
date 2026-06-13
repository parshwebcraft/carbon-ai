"""AI Copilot router — REST endpoints + WebSocket for live session updates."""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from deps import get_current_user
from models import (
    Lead, Product, Activity, Call, WhatsappMessage, Task,
    ConversationSession, ConversationMessage, CopilotSuggestion, LeadInsight,
    User,
)
from services import copilot as copilot_svc

logger = logging.getLogger("facets.copilot")
router = APIRouter(prefix="/copilot", tags=["copilot"])

# ── WebSocket connection manager ─────────────────────────────────────────────

class _ConnectionManager:
    def __init__(self):
        # session_id -> list[WebSocket]
        self._sockets: Dict[int, List[WebSocket]] = {}

    async def connect(self, session_id: int, ws: WebSocket):
        await ws.accept()
        self._sockets.setdefault(session_id, []).append(ws)
        logger.info("WS connected session=%s total=%s", session_id, len(self._sockets[session_id]))

    def disconnect(self, session_id: int, ws: WebSocket):
        if session_id in self._sockets:
            self._sockets[session_id] = [w for w in self._sockets[session_id] if w is not ws]

    async def broadcast(self, session_id: int, data: dict):
        payload = json.dumps(data)
        dead = []
        for ws in list(self._sockets.get(session_id, [])):
            try:
                await ws.send_text(payload)
            except Exception:  # noqa: BLE001
                dead.append(ws)
        for ws in dead:
            self.disconnect(session_id, ws)


manager = _ConnectionManager()


# ── Pydantic I/O models ──────────────────────────────────────────────────────

class SessionCreate(BaseModel):
    lead_id: Optional[int] = None


class SessionOut(BaseModel):
    id: int
    lead_id: Optional[int]
    status: str
    started_at: datetime
    ended_at: Optional[datetime]

    class Config:
        from_attributes = True


class MessageIn(BaseModel):
    speaker: str   # Customer | Salesperson
    content: str


class MessageOut(BaseModel):
    id: int
    session_id: int
    speaker: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class SuggestionOut(BaseModel):
    id: int
    session_id: int
    suggestion_type: str
    content: str
    confidence: float
    created_at: datetime

    class Config:
        from_attributes = True


class InsightOut(BaseModel):
    lead_id: int
    lead_score: int
    intent: str
    budget: str
    timeline: str
    decision_maker: str
    summary: Optional[str]
    updated_at: datetime

    class Config:
        from_attributes = True


class HistorySummaryOut(BaseModel):
    lead_id: int
    summary: str


class ProductRecommendationOut(BaseModel):
    product_name: str
    price: float
    metal_type: Optional[str]
    category: Optional[str]
    reason: str


# ── Helper ───────────────────────────────────────────────────────────────────

def _session_or_404(session_id: int, db: Session) -> ConversationSession:
    sess = db.query(ConversationSession).filter(ConversationSession.id == session_id).first()
    if not sess:
        raise HTTPException(404, "Session not found")
    return sess


def _run_ai_analysis(session_id: int, db: Session) -> dict:
    """Run AI analysis on the current transcript and persist results."""
    sess = _session_or_404(session_id, db)
    messages = [{"speaker": m.speaker, "content": m.content} for m in sess.messages]

    lead = db.query(Lead).filter(Lead.id == sess.lead_id).first() if sess.lead_id else None
    products = db.query(Product).limit(50).all()
    product_dicts = [
        {"product_name": p.product_name, "metal_type": p.metal_type,
         "category": p.category, "purity": p.purity,
         "price": p.price or 0.0}
        for p in products
    ]
    lead_dict = None
    if lead:
        lead_dict = {
            "name": lead.name, "budget": lead.budget,
            "customer_type": lead.customer_type,
            "status": lead.status, "city": lead.city,
        }

    ai = copilot_svc.generate_copilot_suggestions(messages, lead_dict, product_dicts)

    # Persist suggestions
    suggestion_types = [
        ("next_question", ai.get("next_question", "")),
        ("product_suggestion", ai.get("product_suggestion", "")),
        ("offer_suggestion", ai.get("offer_suggestion", "")),
        ("objection_handling", ai.get("objection_handling", "")),
        ("closing_suggestion", ai.get("closing_suggestion", "")),
    ]
    for stype, content in suggestion_types:
        if content:
            db.add(CopilotSuggestion(
                session_id=session_id,
                suggestion_type=stype,
                content=content,
                confidence=0.85,
            ))

    # Persist / update LeadInsight
    if sess.lead_id:
        insight = db.query(LeadInsight).filter(LeadInsight.lead_id == sess.lead_id).first()
        if not insight:
            insight = LeadInsight(lead_id=sess.lead_id)
            db.add(insight)
        insight.lead_score = ai.get("lead_score", 0)
        insight.intent = ai.get("intent", "Unknown")
        insight.budget = ai.get("budget", "Unknown")
        insight.timeline = ai.get("timeline", "Unknown")
        insight.decision_maker = ai.get("decision_maker", "Unknown")
        insight.updated_at = datetime.now(timezone.utc)

    db.commit()
    return ai


# ── REST Endpoints ───────────────────────────────────────────────────────────

@router.post("/sessions", response_model=SessionOut, status_code=201)
def create_session(
    body: SessionCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Start a new copilot conversation session."""
    sess = ConversationSession(lead_id=body.lead_id, status="active")
    db.add(sess)
    db.commit()
    db.refresh(sess)
    return sess


@router.get("/sessions", response_model=List[SessionOut])
def list_sessions(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(ConversationSession).order_by(ConversationSession.started_at.desc()).limit(50).all()


@router.get("/sessions/{session_id}", response_model=SessionOut)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return _session_or_404(session_id, db)


@router.patch("/sessions/{session_id}/end", response_model=SessionOut)
def end_session(
    session_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    sess = _session_or_404(session_id, db)
    sess.status = "ended"
    sess.ended_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(sess)
    return sess


@router.post("/sessions/{session_id}/messages", response_model=MessageOut, status_code=201)
async def add_message(
    session_id: int,
    body: MessageIn,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Add a message to the session and trigger async AI analysis."""
    _session_or_404(session_id, db)
    msg = ConversationMessage(
        session_id=session_id,
        speaker=body.speaker,
        content=body.content,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # Run AI in background and broadcast via WebSocket
    asyncio.create_task(_analyse_and_broadcast(session_id))

    return msg


@router.get("/sessions/{session_id}/messages", response_model=List[MessageOut])
def get_messages(
    session_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    _session_or_404(session_id, db)
    return db.query(ConversationMessage)\
             .filter(ConversationMessage.session_id == session_id)\
             .order_by(ConversationMessage.created_at.asc()).all()


@router.get("/sessions/{session_id}/suggestions", response_model=List[SuggestionOut])
def get_suggestions(
    session_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    _session_or_404(session_id, db)
    # Return latest suggestion per type
    all_suggestions = (
        db.query(CopilotSuggestion)
        .filter(CopilotSuggestion.session_id == session_id)
        .order_by(CopilotSuggestion.created_at.desc())
        .all()
    )
    seen: set[str] = set()
    latest: list[CopilotSuggestion] = []
    for s in all_suggestions:
        if s.suggestion_type not in seen:
            seen.add(s.suggestion_type)
            latest.append(s)
    return latest


@router.post("/sessions/{session_id}/analyse")
def trigger_analysis(
    session_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Synchronously run AI analysis (use when WebSocket is not available)."""
    ai = _run_ai_analysis(session_id, db)
    return ai


# ── Lead Insight endpoints ───────────────────────────────────────────────────

@router.get("/leads/{lead_id}/insight", response_model=InsightOut)
def get_lead_insight(
    lead_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    insight = db.query(LeadInsight).filter(LeadInsight.lead_id == lead_id).first()
    if not insight:
        raise HTTPException(404, "No insight yet — start a copilot session for this lead")
    return insight


@router.get("/leads/{lead_id}/history-summary", response_model=HistorySummaryOut)
def lead_history_summary(
    lead_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")

    whatsapp = db.query(WhatsappMessage)\
                 .filter(WhatsappMessage.lead_id == lead_id)\
                 .order_by(WhatsappMessage.created_at.asc()).limit(20).all()
    calls = db.query(Call)\
              .filter(Call.lead_id == lead_id)\
              .order_by(Call.created_at.desc()).limit(10).all()
    activities = db.query(Activity)\
                   .filter(Activity.lead_id == lead_id)\
                   .order_by(Activity.created_at.desc()).limit(15).all()

    lead_dict = {
        "name": lead.name, "city": lead.city,
        "budget": lead.budget, "customer_type": lead.customer_type,
        "status": lead.status,
    }
    wa_dicts = [{"direction": m.direction, "message": m.message} for m in whatsapp]
    call_dicts = [
        {"call_status": c.call_status, "call_duration": c.call_duration,
         "call_summary": c.call_summary}
        for c in calls
    ]
    act_dicts = [
        {"activity_type": a.activity_type, "description": a.description}
        for a in activities
    ]

    summary = copilot_svc.generate_history_summary(lead_dict, wa_dicts, call_dicts, act_dicts)
    return HistorySummaryOut(lead_id=lead_id, summary=summary)


@router.get("/leads/{lead_id}/product-recommendations", response_model=List[ProductRecommendationOut])
def product_recommendations(
    lead_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")

    # Use notes + customer_type as a minimal transcript
    transcript = []
    if lead.customer_type:
        transcript.append({"speaker": "Customer", "content": lead.customer_type})
    if lead.notes:
        transcript.append({"speaker": "Customer", "content": lead.notes})

    products = db.query(Product).all()
    product_dicts = [
        {"product_name": p.product_name, "metal_type": p.metal_type,
         "category": p.category, "purity": p.purity, "price": p.price or 0.0}
        for p in products
    ]
    recs = copilot_svc.recommend_products(transcript, product_dicts)
    return [
        ProductRecommendationOut(
            product_name=r.get("product_name", ""),
            price=r.get("price", 0.0),
            metal_type=r.get("metal_type"),
            category=r.get("category"),
            reason=r.get("reason", ""),
        )
        for r in recs
    ]


# ── WebSocket ────────────────────────────────────────────────────────────────

@router.websocket("/ws/{session_id}")
async def websocket_endpoint(session_id: int, ws: WebSocket):
    await manager.connect(session_id, ws)
    try:
        while True:
            # Keep alive — client can send ping
            data = await ws.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await ws.send_text(json.dumps({"type": "pong"}))
            except Exception:  # noqa: BLE001
                pass
    except WebSocketDisconnect:
        manager.disconnect(session_id, ws)
        logger.info("WS disconnected session=%s", session_id)


# ── Internal helpers (async) ─────────────────────────────────────────────────

async def _analyse_and_broadcast(session_id: int):
    """Run blocking AI call in thread-pool and broadcast results."""
    from database import SessionLocal

    def _sync_run():
        db = SessionLocal()
        try:
            return _run_ai_analysis(session_id, db)
        finally:
            db.close()

    loop = asyncio.get_event_loop()
    try:
        result = await loop.run_in_executor(None, _sync_run)
        await manager.broadcast(session_id, {"type": "suggestions", "data": result})
    except Exception as e:  # noqa: BLE001
        logger.error("AI analysis error session=%s: %s", session_id, e)
        await manager.broadcast(session_id, {"type": "error", "message": str(e)})


# ── Phase 2: Pipeline Intelligence endpoints ──────────────────────────────────

class PipelineLeadOut(BaseModel):
    lead_id: int
    name: str
    status: str
    customer_type: Optional[str]
    budget: float
    city: Optional[str]
    lead_score: int
    intent: str
    timeline: str
    conversion_probability: int
    is_hot: bool
    has_insight: bool

    class Config:
        from_attributes = True


class FollowUpOut(BaseModel):
    lead_id: int
    lead_name: str
    days_stale: int
    status: str
    customer_type: Optional[str]
    budget: float
    priority: str
    message: str
    action_type: str


class CreateTaskFromFollowUpIn(BaseModel):
    lead_id: int
    title: str
    description: str
    assigned_to: Optional[int] = None


@router.get("/pipeline", response_model=List[PipelineLeadOut])
def get_pipeline(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return all leads ranked by AI lead_score desc. Joins LeadInsight where available."""
    leads = db.query(Lead).order_by(Lead.updated_at.desc()).all()
    result = []
    for lead in leads:
        insight = db.query(LeadInsight).filter(LeadInsight.lead_id == lead.id).first()
        score = insight.lead_score if insight else 0
        prob = getattr(insight, "conversion_probability", 0) or 0
        result.append(PipelineLeadOut(
            lead_id=lead.id,
            name=lead.name,
            status=lead.status or "New",
            customer_type=lead.customer_type,
            budget=lead.budget or 0.0,
            city=lead.city,
            lead_score=score,
            intent=insight.intent if insight else "Unknown",
            timeline=insight.timeline if insight else "Unknown",
            conversion_probability=prob,
            is_hot=score >= 75,
            has_insight=insight is not None,
        ))
    # Sort: hot leads first, then by score desc
    result.sort(key=lambda x: (-x.lead_score, x.name))
    return result


@router.post("/batch-score")
async def batch_score(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Background task: score all leads that have no LeadInsight yet."""
    unscored = (
        db.query(Lead)
        .outerjoin(LeadInsight, Lead.id == LeadInsight.lead_id)
        .filter(LeadInsight.id == None)  # noqa: E711
        .limit(20).all()
    )
    asyncio.create_task(_batch_score_background([l.id for l in unscored]))
    return {"queued": len(unscored), "message": f"Scoring {len(unscored)} leads in background"}


@router.get("/follow-ups", response_model=List[FollowUpOut])
def get_follow_ups(
    stale_days: int = 7,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return AI-generated follow-up suggestions for leads with no activity in stale_days."""
    from datetime import timedelta
    from sqlalchemy import func

    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=stale_days)

    # Subquery: latest activity per lead
    latest_activity = (
        db.query(
            Activity.lead_id,
            func.max(Activity.created_at).label("last_at"),
        )
        .group_by(Activity.lead_id)
        .subquery()
    )

    # Leads that either have no activity or last activity older than cutoff
    active_lead_ids = (
        db.query(latest_activity.c.lead_id)
        .filter(latest_activity.c.last_at >= cutoff)
        .all()
    )
    active_ids = {row[0] for row in active_lead_ids}

    stale_leads_orm = (
        db.query(Lead)
        .filter(
            Lead.status.notin_(["Won", "Lost"]),
            Lead.id.notin_(active_ids),
        )
        .order_by(Lead.updated_at.asc())
        .limit(20)
        .all()
    )

    if not stale_leads_orm:
        return []

    # Build dicts with days_stale calculated
    today = datetime.now(timezone.utc).replace(tzinfo=None)
    stale_dicts = []
    for lead in stale_leads_orm:
        updated = lead.updated_at.replace(tzinfo=None) if lead.updated_at else today
        days = (today - updated).days
        stale_dicts.append({
            "id": lead.id, "name": lead.name, "city": lead.city,
            "customer_type": lead.customer_type, "budget": lead.budget or 0,
            "status": lead.status, "last_activity_days": days, "notes": lead.notes,
        })

    suggestions = copilot_svc.generate_follow_up_suggestions(stale_dicts)
    return [
        FollowUpOut(
            lead_id=s["lead_id"],
            lead_name=s["lead_name"],
            days_stale=s["days_stale"],
            status=s.get("status", ""),
            customer_type=s.get("customer_type"),
            budget=s.get("budget", 0),
            priority=s["priority"],
            message=s["message"],
            action_type=s["action_type"],
        )
        for s in suggestions
    ]


@router.post("/follow-ups/create-task", status_code=201)
def create_task_from_followup(
    body: CreateTaskFromFollowUpIn,
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    """Convert a follow-up suggestion into a real Task in the tasks table."""
    task = Task(
        lead_id=body.lead_id,
        assigned_to=body.assigned_to or me.id,
        title=body.title,
        description=body.description,
        priority="High",
        status="Open",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return {"task_id": task.id, "message": "Task created successfully"}


# ── Batch score background helper ─────────────────────────────────────────────

async def _batch_score_background(lead_ids: list[int]):
    from database import SessionLocal

    def _sync():
        db = SessionLocal()
        scored = 0
        try:
            for lead_id in lead_ids:
                lead = db.query(Lead).filter(Lead.id == lead_id).first()
                if not lead:
                    continue
                activities = (
                    db.query(Activity)
                    .filter(Activity.lead_id == lead_id)
                    .order_by(Activity.created_at.desc()).limit(8).all()
                )
                lead_dict = {
                    "name": lead.name, "city": lead.city,
                    "customer_type": lead.customer_type,
                    "status": lead.status, "budget": lead.budget,
                }
                act_dicts = [
                    {"activity_type": a.activity_type, "description": a.description}
                    for a in activities
                ]
                try:
                    ai = copilot_svc.score_lead_quick(lead_dict, act_dicts)
                    insight = db.query(LeadInsight).filter(LeadInsight.lead_id == lead_id).first()
                    if not insight:
                        insight = LeadInsight(lead_id=lead_id)
                        db.add(insight)
                    insight.lead_score = ai.get("lead_score", 0)
                    insight.intent = ai.get("intent", "Unknown")
                    insight.budget = ai.get("budget", "Unknown")
                    insight.timeline = ai.get("timeline", "Unknown")
                    insight.decision_maker = ai.get("decision_maker", "Unknown")
                    insight.updated_at = datetime.now(timezone.utc)
                    db.commit()
                    scored += 1
                except Exception as e:  # noqa: BLE001
                    logger.warning("Batch score lead=%s failed: %s", lead_id, e)
        finally:
            db.close()
        return scored

    loop = asyncio.get_event_loop()
    try:
        n = await loop.run_in_executor(None, _sync)
        logger.info("Batch scored %s leads", n)
    except Exception as e:  # noqa: BLE001
        logger.error("Batch score failed: %s", e)
