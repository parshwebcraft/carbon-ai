"""Background scheduler for WhatsApp follow-ups.

Runs as a single asyncio task launched on FastAPI startup. Every CHECK_INTERVAL
seconds it scans recent WhatsApp threads and:
  - For threads whose last *inbound* message is older than FOLLOWUP_MINUTES and
    the last *outbound* is older than FOLLOWUP_MINUTES, sends one AI follow-up.
  - It records the outbound message in the DB regardless of whether Meta send
    succeeds (graceful degradation).
"""
import asyncio
import logging
import os
from datetime import datetime, timezone, timedelta

from sqlalchemy import func

from database import SessionLocal
from models import Lead, WhatsappMessage
from services import deepseek, whatsapp_cloud

logger = logging.getLogger("facets.scheduler")

CHECK_INTERVAL = int(os.environ.get("AUTOMATION_CHECK_INTERVAL", "120"))
FOLLOWUP_MINUTES = int(os.environ.get("AUTOMATION_FOLLOWUP_MINUTES", "180"))
MAX_FOLLOWUPS_PER_RUN = int(os.environ.get("AUTOMATION_MAX_PER_RUN", "5"))


def followups_enabled() -> bool:
    return os.environ.get("AUTOMATION_FOLLOWUP_ENABLED", "false").lower() == "true"


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def run_once_sync() -> int:
    """One pass over all conversations. Returns number of follow-ups sent."""
    if not followups_enabled():
        return 0
    if not deepseek.os.environ.get("DEEPSEEK_API_KEY"):
        return 0

    sent = 0
    db = SessionLocal()
    try:
        rows = (
            db.query(
                WhatsappMessage.lead_id,
                func.max(WhatsappMessage.created_at).label("last_at"),
            )
            .group_by(WhatsappMessage.lead_id)
            .all()
        )
        threshold = datetime.now(timezone.utc) - timedelta(minutes=FOLLOWUP_MINUTES)
        for lead_id, last_at in rows:
            if sent >= MAX_FOLLOWUPS_PER_RUN:
                break
            if _aware(last_at) > threshold:
                continue
            lead = db.query(Lead).filter(Lead.id == lead_id).first()
            if not lead or lead.status in ("Won", "Lost"):
                continue
            history = (
                db.query(WhatsappMessage)
                .filter(WhatsappMessage.lead_id == lead_id)
                .order_by(WhatsappMessage.created_at.asc())
                .all()
            )
            if not history or history[-1].direction == "out":
                continue  # we already replied last

            try:
                body = deepseek.followup_message(
                    {
                        "name": lead.name, "customer_type": lead.customer_type,
                        "status": lead.status, "budget": lead.budget, "city": lead.city,
                    },
                    [{"direction": m.direction, "message": m.message} for m in history],
                )
            except Exception as e:  # noqa: BLE001
                logger.warning("DeepSeek followup failed: %s", e)
                continue

            try:
                if whatsapp_cloud.is_configured() and lead.phone:
                    whatsapp_cloud.send_text(lead.phone, body)
            except Exception as e:  # noqa: BLE001
                logger.warning("WhatsApp Cloud send failed: %s", e)

            db.add(WhatsappMessage(
                lead_id=lead.id, direction="out",
                message=f"[AUTO FOLLOWUP] {body}",
            ))
            db.commit()
            sent += 1
        return sent
    finally:
        db.close()


async def loop():
    logger.info("Follow-up scheduler started (interval=%ss enabled=%s)",
                CHECK_INTERVAL, followups_enabled())
    while True:
        try:
            await asyncio.to_thread(run_once_sync)
        except Exception as e:  # noqa: BLE001
            logger.exception("scheduler iteration error: %s", e)
        await asyncio.sleep(CHECK_INTERVAL)
