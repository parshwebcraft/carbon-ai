"""Background campaign execution engine.

Walks every `running` campaign, respects pacing (calls-per-minute) and the
active calling window (IST), and dispatches the next batch of pending targets
through the dialer (mock or Vapi). Applies post-call automations:
  - update lead status,
  - create timeline activity,
  - auto-create follow-up tasks,
  - record AIAgentLog entries.

The loop is launched on FastAPI startup (server.py).
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import time as _time
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import and_, func

from database import SessionLocal
from models import (
    AIAgentLog, Activity, Call, Campaign, CampaignTarget, Lead, Setting, Task,
)
from services import campaign_dialer

logger = logging.getLogger("facets.campaign_engine")

TICK_SECONDS = int(os.environ.get("CAMPAIGN_TICK_SECONDS", "10"))

IST = timezone(timedelta(hours=5, minutes=30))

DEFAULT_CALLING_SETTINGS = {
    "daily_call_limit": 500,
    "start_time": "10:00",
    "end_time": "18:00",
    "calls_per_minute": 5,
    "enabled": True,
}


# ---------------------------------------------------------------------------
# Settings helpers
# ---------------------------------------------------------------------------

def get_calling_settings(db) -> dict:
    row = db.query(Setting).filter(Setting.key == "calling").first()
    if not row:
        row = Setting(key="calling", value=json.dumps(DEFAULT_CALLING_SETTINGS))
        db.add(row)
        db.commit()
        db.refresh(row)
    try:
        return {**DEFAULT_CALLING_SETTINGS, **json.loads(row.value)}
    except Exception:  # noqa: BLE001
        return dict(DEFAULT_CALLING_SETTINGS)


def save_calling_settings(db, patch: dict) -> dict:
    current = get_calling_settings(db)
    current.update({k: v for k, v in patch.items() if v is not None})
    row = db.query(Setting).filter(Setting.key == "calling").first()
    if not row:
        row = Setting(key="calling", value=json.dumps(current))
        db.add(row)
    else:
        row.value = json.dumps(current)
    db.commit()
    return current


# ---------------------------------------------------------------------------
# Window + cap helpers
# ---------------------------------------------------------------------------

def _within_window(now_ist: datetime, hhmm_start: str, hhmm_end: str) -> bool:
    try:
        sh, sm = (int(x) for x in hhmm_start.split(":"))
        eh, em = (int(x) for x in hhmm_end.split(":"))
    except Exception:  # noqa: BLE001
        return True
    cur = now_ist.hour * 60 + now_ist.minute
    start = sh * 60 + sm
    end = eh * 60 + em
    if end <= start:
        # 22:00 -> 06:00 style — treat as 24x7 fallback
        return True
    return start <= cur <= end


def _dialed_today(db, campaign_id: int) -> int:
    start_utc = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return (db.query(func.count(CampaignTarget.id))
            .filter(CampaignTarget.campaign_id == campaign_id,
                    CampaignTarget.last_attempt_at >= start_utc)
            .scalar() or 0)


# ---------------------------------------------------------------------------
# Per-target processing
# ---------------------------------------------------------------------------

FOLLOWUP_TASKS = {
    "interested": ("Follow up with interested lead",
                   "Customer showed real interest on AI call. Re-engage within 24h with curated catalogue."),
    "showroom_visit_requested": ("Confirm showroom visit",
                                 "AI call booked a showroom visit. Confirm slot, share location and assign stylist."),
    "quotation_requested": ("Prepare and send quotation",
                            "Customer requested a quotation on the AI call. Send formal QT within 60 minutes."),
    "callback_requested": ("Callback the customer",
                           "Customer requested a callback during the AI call. Call back today."),
}


def _apply_outcome(db, campaign: Campaign, tgt: CampaignTarget,
                   result: campaign_dialer.CallResult) -> None:
    """Write everything: status, automations, activity, AI log, task."""
    tgt.call_status = result.final_status
    tgt.duration = result.duration or 0
    tgt.transcript = result.transcript
    tgt.summary = result.summary
    tgt.sentiment = result.sentiment
    tgt.lead_score = result.lead_score
    tgt.next_action = result.next_action
    tgt.outcome = result.outcome
    tgt.recording_url = result.recording_url
    tgt.call_cost = result.call_cost or 0.0
    tgt.vapi_call_id = result.vapi_call_id
    tgt.last_attempt_at = datetime.now(timezone.utc)
    tgt.attempts = (tgt.attempts or 0) + 1

    # Automations only apply when we have a linked lead AND a final outcome
    if tgt.lead_id and result.outcome:
        lead = db.query(Lead).filter(Lead.id == tgt.lead_id).first()
        if lead:
            # Status precedence — never downgrade a hotter lead
            STATUS_RANK = {
                "New": 0, "Contacted": 1, "Follow Up": 2, "Interested": 3,
                "Visit Scheduled": 4, "Quotation Sent": 5, "Negotiation": 6,
                "Won": 7, "Lost": -1,
            }
            new_status = campaign_dialer.OUTCOME_TO_LEAD_STATUS.get(result.outcome)
            if new_status and lead.status != "Won":
                if new_status == "Lost":
                    # Never auto-mark a Won/Quotation Sent/Negotiation lead as Lost
                    if STATUS_RANK.get(lead.status, 0) < STATUS_RANK["Negotiation"]:
                        lead.status = "Lost"
                elif STATUS_RANK.get(new_status, 0) > STATUS_RANK.get(lead.status, 0):
                    lead.status = new_status
            db.add(Activity(
                lead_id=lead.id,
                activity_type="Call",
                description=f"[AI Campaign #{campaign.id} — {campaign.name}] "
                            f"Outcome: {result.outcome}. {result.summary or ''}",
                created_by=campaign.created_by,
            ))
            # Also drop a Call row so the legacy Calls page shows it
            db.add(Call(
                lead_id=lead.id,
                call_status="Completed" if result.final_status == "completed" else result.final_status.capitalize(),
                call_duration=result.duration or 0,
                call_summary=result.summary,
                transcript=result.transcript,
                sentiment=result.sentiment,
                vapi_call_id=result.vapi_call_id,
            ))
            db.add(AIAgentLog(
                lead_id=lead.id,
                conversation_summary=result.summary,
                sentiment=result.sentiment or "Neutral",
                next_action=result.next_action or "Follow up",
            ))

    # Follow-up task triggers (work even if lead_id is null — task is unassigned)
    triggers = []
    if result.outcome:
        b = campaign_dialer.FOLLOWUP_TRIGGERS.get(result.outcome)
        if b:
            triggers.append(b)
    if result.callback_requested:
        triggers.append("callback_requested")
    for t in triggers:
        title, desc = FOLLOWUP_TASKS[t]
        db.add(Task(
            lead_id=tgt.lead_id,
            assigned_to=campaign.created_by,
            title=f"{title} — {tgt.name}",
            description=desc + f"\nOutcome: {result.outcome}\nLead score: {result.lead_score}",
            priority="High" if t != "callback_requested" else "Medium",
            status="Open",
            due_date=datetime.now(timezone.utc) + timedelta(days=1),
        ))


def _process_one(db, campaign: Campaign, tgt: CampaignTarget) -> None:
    tgt.call_status = "dialing"
    db.commit()
    target_payload = {
        "name": tgt.name, "phone": tgt.phone, "city": tgt.city,
        "notes": tgt.notes, "source": tgt.source,
    }
    if tgt.lead_id:
        lead = db.query(Lead).filter(Lead.id == tgt.lead_id).first()
        if lead:
            target_payload.update({
                "customer_type": lead.customer_type, "budget": lead.budget,
                "status": lead.status,
            })

    try:
        result = campaign_dialer.dial(
            target=target_payload,
            campaign_prompt=campaign.campaign_prompt,
            lead_prompt_override=tgt.lead_prompt_override,
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("Dial crashed for target %s: %s", tgt.id, e)
        tgt.call_status = "failed"
        tgt.summary = f"Engine error: {e}"
        tgt.last_attempt_at = datetime.now(timezone.utc)
        db.commit()
        return

    _apply_outcome(db, campaign, tgt, result)
    db.commit()


# ---------------------------------------------------------------------------
# Loop
# ---------------------------------------------------------------------------

def _campaign_window(campaign: Campaign, settings: dict) -> tuple[str, str]:
    return (campaign.start_time or settings["start_time"],
            campaign.end_time or settings["end_time"])


def _campaign_cpm(campaign: Campaign, settings: dict) -> int:
    return int(campaign.calls_per_minute or settings["calls_per_minute"])


def _campaign_daily_cap(campaign: Campaign, settings: dict) -> int:
    return int(campaign.daily_call_limit or settings["daily_call_limit"])


def run_tick_sync() -> dict:
    """One pass across all running campaigns. Returns a brief stats dict."""
    db = SessionLocal()
    placed = 0
    try:
        settings = get_calling_settings(db)
        if not settings.get("enabled", True):
            return {"placed": 0, "skipped": "engine disabled"}

        running = (db.query(Campaign)
                   .filter(Campaign.status == "running")
                   .order_by(Campaign.id.asc()).all())
        if not running:
            return {"placed": 0}

        now_ist = datetime.now(IST)

        for campaign in running:
            s_start, s_end = _campaign_window(campaign, settings)
            if not _within_window(now_ist, s_start, s_end):
                continue

            cpm = _campaign_cpm(campaign, settings)
            # How many calls can we place this tick at cpm calls/minute?
            allowed_this_tick = max(1, int(round(cpm * TICK_SECONDS / 60.0)))

            cap = _campaign_daily_cap(campaign, settings)
            already = _dialed_today(db, campaign.id)
            remaining_today = max(0, cap - already)
            allowed_this_tick = min(allowed_this_tick, remaining_today)
            if allowed_this_tick <= 0:
                continue

            pending = (db.query(CampaignTarget)
                       .filter(CampaignTarget.campaign_id == campaign.id,
                               CampaignTarget.call_status == "pending")
                       .order_by(CampaignTarget.id.asc())
                       .limit(allowed_this_tick).all())
            if not pending:
                # Mark campaign completed if there's nothing left
                any_left = (db.query(CampaignTarget.id)
                            .filter(CampaignTarget.campaign_id == campaign.id,
                                    CampaignTarget.call_status.in_(
                                        ["pending", "queued", "dialing", "ringing"]))
                            .first())
                if not any_left:
                    campaign.status = "completed"
                    campaign.completed_at = datetime.now(timezone.utc)
                    db.commit()
                continue

            for tgt in pending:
                _process_one(db, campaign, tgt)
                placed += 1

        return {"placed": placed}
    finally:
        db.close()


async def loop():
    logger.info("Campaign engine started (tick=%ss, provider=%s)",
                TICK_SECONDS, campaign_dialer.provider_name())
    while True:
        try:
            await asyncio.to_thread(run_tick_sync)
        except Exception as e:  # noqa: BLE001
            logger.exception("campaign engine tick crashed: %s", e)
        await asyncio.sleep(TICK_SECONDS)
