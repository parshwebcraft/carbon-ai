"""Automated Spaced Follow-Up Drip Engine (Day 1, Day 3, Day 7).

Scans leads whose last contact was >24h (Day 1), >72h (Day 3), or >168h (Day 7).
Auto-pauses if customer responds, if status is Won/Lost, or if human handover active.
"""
import asyncio
import json
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any

from database import SessionLocal
from models import Lead, WhatsappMessage, AiAgentConfig
from services import whatsapp_cloud

logger = logging.getLogger("facets.scheduler")

CHECK_INTERVAL = int(os.environ.get("AUTOMATION_CHECK_INTERVAL", "300")) # Run check every 5 minutes
MAX_DRIPS_PER_RUN = int(os.environ.get("AUTOMATION_MAX_PER_RUN", "10"))

# Default Spaced Drip Templates (Can be customized via AiAgentConfig)
DEFAULT_DAY1_TEXT = (
    "Hi {name}! 👋 Just following up to see if you had a chance to review the details "
    "we shared yesterday? Let me know if you have any questions or if you'd like to book a quick 15-minute discovery call!"
)
DEFAULT_DAY3_TEXT = (
    "Hi {name}, quick check-in from Parsh Web Craft! We are currently finalizing our "
    "project delivery sprints for this month. Would you like us to reserve a slot for your project "
    "or share our agency overview portfolio?"
)
DEFAULT_DAY7_TEXT = (
    "Hi {name}, hope you're having a productive week! I understand you might be busy right now, "
    "so I won't crowd your WhatsApp. Whenever you're ready to proceed with your project, "
    "feel free to ping us right here. Wishing you the best! 😊"
)


def followups_enabled() -> bool:
    """Check if automated followups are enabled in .env or default to True."""
    val = os.environ.get("AUTOMATION_FOLLOWUP_ENABLED", "true").lower()
    return val in ("true", "1", "yes")


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def run_drip_cycle_sync() -> int:
    """Execute one pass of the Spaced Follow-Up Drip Engine across all companies.
    
    Returns:
        int: Number of drip messages dispatched.
    """
    if not followups_enabled():
        return 0

    sent_count = 0
    now = datetime.now(timezone.utc)
    db = SessionLocal()

    try:
        # Find active leads eligible for follow-up drip
        eligible_leads = (
            db.query(Lead)
            .filter(
                Lead.drip_status.in_(["active", None]),
                Lead.ai_bot_paused == False,
                Lead.status.notin_(["Won", "Lost", "Needs human"]),
                Lead.phone != None,
                Lead.phone != "",
            )
            .order_by(Lead.id.desc())
            .all()
        )

        for lead in eligible_leads:
            if sent_count >= MAX_DRIPS_PER_RUN:
                break

            # 1. Check company-level AiAgentConfig drip settings
            cfg = db.query(AiAgentConfig).filter(AiAgentConfig.company_id == lead.company_id).first()
            if not cfg:
                cfg = db.query(AiAgentConfig).first()
            if cfg and hasattr(cfg, "drip_followup_enabled") and cfg.drip_followup_enabled is False:
                continue

            # 2. Inspect latest conversation messages for this lead
            messages = (
                db.query(WhatsappMessage)
                .filter(WhatsappMessage.lead_id == lead.id)
                .order_by(WhatsappMessage.created_at.asc())
                .all()
            )

            # If customer's last message was recent, or customer responded AFTER our last outbound, stop drip
            if messages:
                last_msg = messages[-1]
                if last_msg.direction == "in":
                    # Customer replied! Stop automated drip so human/bot handles conversation naturally
                    lead.drip_status = "stopped"
                    db.commit()
                    continue

            # Calculate time since last touch point (customer message or previous drip)
            last_touch = lead.last_drip_sent_at or lead.last_customer_message_at or lead.created_at
            if not last_touch:
                last_touch = lead.created_at
            hours_elapsed = (now - _aware(last_touch)).total_seconds() / 3600.0

            current_step = lead.drip_step or 0
            drip_msg_text = None
            buttons = None
            step_name = None

            # -------------------------------------------------------------
            # STEP 1: Day 1 Follow-up (~24 hours after initial interaction)
            # -------------------------------------------------------------
            if current_step == 0 and hours_elapsed >= 22.0:
                step_name = "Day 1 Follow-Up"
                tmpl = (cfg.drip_day1_text if (cfg and getattr(cfg, "drip_day1_text", None)) else None) or DEFAULT_DAY1_TEXT
                drip_msg_text = tmpl.replace("{name}", (lead.name or "there").strip())
                buttons = [
                    {"id": "btn_call", "title": "📅 Book a Call"},
                    {"id": "btn_active", "title": "✅ Still Interested"},
                    {"id": "btn_human", "title": "👤 Talk to Team"},
                ]
                next_step = 1

            # -------------------------------------------------------------
            # STEP 2: Day 3 Follow-up (~48h after Step 1 / ~72h total)
            # -------------------------------------------------------------
            elif current_step == 1 and hours_elapsed >= 46.0:
                step_name = "Day 3 Follow-Up"
                tmpl = (cfg.drip_day3_text if (cfg and getattr(cfg, "drip_day3_text", None)) else None) or DEFAULT_DAY3_TEXT
                drip_msg_text = tmpl.replace("{name}", (lead.name or "there").strip())
                buttons = [
                    {"id": "btn_call", "title": "📅 Book a Call"},
                    {"id": "btn_proposal", "title": "📑 View Packages"},
                    {"id": "btn_later", "title": "⏳ Later this month"},
                ]
                next_step = 2

            # -------------------------------------------------------------
            # STEP 3: Day 7 Follow-up (~96h after Step 2 / ~7 days total)
            # -------------------------------------------------------------
            elif current_step == 2 and hours_elapsed >= 94.0:
                step_name = "Day 7 Final Nudge"
                tmpl = (cfg.drip_day7_text if (cfg and getattr(cfg, "drip_day7_text", None)) else None) or DEFAULT_DAY7_TEXT
                drip_msg_text = tmpl.replace("{name}", (lead.name or "there").strip())
                buttons = [
                    {"id": "btn_human", "title": "👤 Talk to Team"},
                ]
                next_step = 3

            else:
                continue

            # Dispatch via Meta WhatsApp API
            logger.info("Executing %s for lead %s (%s, elapsed: %.1f hrs)", step_name, lead.id, lead.name, hours_elapsed)
            sent_ok = False
            sent_interactive = False

            try:
                if whatsapp_cloud.is_configured() and lead.phone:
                    try:
                        whatsapp_cloud.send_quick_reply_buttons(
                            to=lead.phone,
                            body=drip_msg_text,
                            buttons=buttons,
                            footer="ParshWebCraft Follow-Up",
                            company_id=lead.company_id,
                        )
                        sent_interactive = True
                        sent_ok = True
                    except Exception as e_btn:
                        logger.warning("Sending interactive drip buttons failed, falling back to approved Meta template 'lead_followup_checkin': %s", e_btn)
                        try:
                            whatsapp_cloud.send_template(
                                to=lead.phone,
                                template_name="lead_followup_checkin",
                                language_code="en",
                                components=[
                                    {
                                        "type": "body",
                                        "parameters": [
                                            {"type": "text", "text": (lead.name or "there").strip()}
                                        ]
                                    }
                                ],
                                company_id=lead.company_id,
                            )
                            sent_interactive = True
                            sent_ok = True
                        except Exception as e_tmpl:
                            logger.warning("Sending template fallback failed, trying plain text: %s", e_tmpl)
                            whatsapp_cloud.send_text(lead.phone, drip_msg_text, company_id=lead.company_id)
                            sent_ok = True
                else:
                    sent_ok = True  # Simulated in local dev
            except Exception as e_send:
                logger.error("Failed to send %s to lead %s: %s", step_name, lead.id, e_send)

            # Record outbound message in DB
            out_msg = WhatsappMessage(
                lead_id=lead.id,
                company_id=lead.company_id,
                direction="out",
                message=f"[DRIP {step_name.upper()}] {drip_msg_text}",
                buttons_json=json.dumps(buttons) if sent_interactive else None,
                interactive_type="button" if sent_interactive else None,
            )
            db.add(out_msg)

            # Update lead drip state
            lead.drip_step = next_step
            lead.last_drip_sent_at = now
            if next_step >= 3:
                lead.drip_status = "completed"
            db.commit()

            sent_count += 1

        return sent_count

    except Exception as e:
        logger.exception("Error in Spaced Follow-Up Drip run: %s", e)
        return sent_count
    finally:
        db.close()


async def loop():
    """Background asyncio worker running inside FastAPI server."""
    logger.info("Spaced Follow-Up Drip Scheduler running (interval=%ss, enabled=%s)",
                CHECK_INTERVAL, followups_enabled())
    while True:
        try:
            await asyncio.to_thread(run_drip_cycle_sync)
        except Exception as e:
            logger.exception("Drip loop iteration error: %s", e)
        await asyncio.sleep(CHECK_INTERVAL)
