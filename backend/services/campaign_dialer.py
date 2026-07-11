"""Outbound dialer abstraction for the campaign engine.

Designed so the existing mocked behaviour can be swapped for a real Vapi.ai
provider by simply populating VAPI_API_KEY + VAPI_PHONE_NUMBER_ID — no code
refactor required.
"""
from __future__ import annotations

import logging
import os
import random
import time
from dataclasses import dataclass
from typing import Optional
from sqlalchemy.orm import Session

from services import vapi_voice

logger = logging.getLogger("facets.dialer")


# ---------------------------------------------------------------------------
# Jewellery-specific outcome taxonomy + post-call automations
# ---------------------------------------------------------------------------

OUTCOMES = [
    "Bridal Inquiry",
    "Gold Purchase",
    "Diamond Purchase",
    "Exchange Inquiry",
    "Investment Gold",
    "Appointment Booked",
    "Quotation Requested",
    "Not Interested",
]

# Outcome -> follow-up trigger bucket
FOLLOWUP_TRIGGERS = {
    "Bridal Inquiry": "interested",
    "Gold Purchase": "interested",
    "Diamond Purchase": "interested",
    "Exchange Inquiry": "interested",
    "Investment Gold": "interested",
    "Appointment Booked": "showroom_visit_requested",
    "Quotation Requested": "quotation_requested",
    "Not Interested": None,
}

# Outcome -> CRM lead status
OUTCOME_TO_LEAD_STATUS = {
    "Bridal Inquiry": "Interested",
    "Gold Purchase": "Interested",
    "Diamond Purchase": "Interested",
    "Exchange Inquiry": "Interested",
    "Investment Gold": "Interested",
    "Appointment Booked": "Visit Scheduled",
    "Quotation Requested": "Quotation Sent",
    "Not Interested": "Lost",
}


@dataclass
class CallResult:
    final_status: str           # completed | failed | busy | no_answer
    duration: int               # seconds
    outcome: Optional[str]      # one of OUTCOMES (only when final_status=completed)
    sentiment: Optional[str]    # Positive | Neutral | Negative
    summary: Optional[str]
    transcript: Optional[str]
    lead_score: Optional[int]
    next_action: Optional[str]
    recording_url: Optional[str]
    call_cost: float
    callback_requested: bool = False
    vapi_call_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Mocked dialer — deterministic-ish but jewellery-flavoured
# ---------------------------------------------------------------------------

AGENCY_TRANSCRIPT_TEMPLATES = {
    "Website Design": [
        ("Agent", "Hello {name}, this is Aanya from ParshWebCraft digital agency. Is this a good time?"),
        ("Customer", "Yes please."),
        ("Agent", "Wonderful — I saw your inquiry about a website redesign. Are you looking for a custom React/Node site or WordPress?"),
        ("Customer", "Looking for a modern corporate website built on React."),
        ("Agent", "Great choice. What is your expected timeline and budget for this project?"),
        ("Customer", "Within two months. Budget is around one to one point five lakhs."),
        ("Agent", "Perfect. I'll have our lead architect call you to share our portfolio. Shall I schedule a 15-minute discovery call for {city}?"),
        ("Customer", "Yes, that works."),
    ],
    "Custom E-commerce": [
        ("Agent", "Namaste {name}, Aanya from ParshWebCraft here."),
        ("Customer", "Hi, go ahead."),
        ("Agent", "We are helping local businesses set up Shopify or custom e-commerce stores to double sales. Are you looking to launch a new store or migrate?"),
        ("Customer", "Launch a new online boutique."),
        ("Agent", "Excellent. May I share a copy of our e-commerce case studies on WhatsApp?"),
        ("Customer", "Sure."),
    ],
    "Mobile App Development": [
        ("Agent", "Hello {name}, this is Aanya from ParshWebCraft."),
        ("Customer", "Yes?"),
        ("Agent", "We have specialized Flutter developers ready to launch iOS/Android apps. Are you looking for a cross-platform app or native?"),
        ("Customer", "A cross-platform app for delivery service."),
        ("Agent", "Got it. May I send our portfolio + timeline estimate on WhatsApp and schedule a call with our technical lead?"),
        ("Customer", "Yes please."),
    ],
    "SEO Audit": [
        ("Agent", "Hi {name}, calling from ParshWebCraft. We are offering a free SEO audit for local businesses in {city}."),
        ("Customer", "What does it include?"),
        ("Agent", "It covers speed audit, search ranking analysis, and 3 competitor secrets. Shall I block a slot with our marketer to review it?"),
        ("Customer", "Sounds reasonable, let's do it."),
    ],
    "Custom Software": [
        ("Agent", "Hello {name}, this is Aanya. Calling about custom CRM/ERP development to automate business workflows."),
        ("Customer", "Tell me more."),
        ("Agent", "We build tailor-made dashboards, user portals, and API integrations. Most clients start with a basic MVP. What is your requirement?"),
        ("Customer", "Yes, send the details."),
    ],
    "Appointment Booked": [
        ("Agent", "Hi {name}, would you like to schedule a free 15-minute discovery Zoom call?"),
        ("Customer", "Yes, when is a good time?"),
        ("Agent", "We have slots open this weekend. Saturday 12pm?"),
        ("Customer", "Saturday 12pm works. Please book it."),
    ],
    "Quotation Requested": [
        ("Agent", "Hi {name}, following up on your proposal request."),
        ("Customer", "Yes, please send me a detailed estimate for the React website we discussed."),
        ("Agent", "Will share the proposal document within the hour with scope and timeline breakdown."),
    ],
    "Not Interested": [
        ("Agent", "Hello {name}, calling from ParshWebCraft."),
        ("Customer", "Not interested at the moment, please remove my number."),
        ("Agent", "Understood, apologies for the disturbance. Have a lovely day."),
    ],
}

SENTIMENT_BY_OUTCOME = {
    "Bridal Inquiry": "Positive",
    "Gold Purchase": "Positive",
    "Diamond Purchase": "Positive",
    "Exchange Inquiry": "Neutral",
    "Investment Gold": "Positive",
    "Appointment Booked": "Positive",
    "Quotation Requested": "Positive",
    "Not Interested": "Negative",
}

NEXT_ACTION_BY_OUTCOME = {
    "Bridal Inquiry": "Send bridal catalogue on WhatsApp and book private styling session",
    "Gold Purchase": "Share 5 curated 22K designs on WhatsApp within 1 hour",
    "Diamond Purchase": "Send IGI certified solitaire options and price comparison",
    "Exchange Inquiry": "Block valuation slot at showroom and share exchange rate sheet",
    "Investment Gold": "Send digital gold enrollment link and explain 11th-month-free benefit",
    "Appointment Booked": "Confirm showroom visit, share location, assign in-store stylist",
    "Quotation Requested": "Prepare formal quotation with making + GST and send within 60 minutes",
    "Not Interested": "Mark as Lost; do not contact for 90 days",
}

LEAD_SCORE_BY_OUTCOME = {
    "Bridal Inquiry": (80, 95),
    "Gold Purchase": (65, 85),
    "Diamond Purchase": (70, 90),
    "Exchange Inquiry": (55, 75),
    "Investment Gold": (60, 80),
    "Appointment Booked": (85, 95),
    "Quotation Requested": (80, 92),
    "Not Interested": (5, 20),
}


MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
               "July", "August", "September", "October", "November", "December"]


def _mock_outcome(target: dict) -> Optional[str]:
    """Bias outcomes by customer_type / source when available."""
    ctype = (target.get("customer_type") or "").lower()
    source = (target.get("source") or "").lower()
    weights = {
        "Bridal Inquiry": 12,
        "Gold Purchase": 18,
        "Diamond Purchase": 12,
        "Exchange Inquiry": 8,
        "Investment Gold": 8,
        "Appointment Booked": 10,
        "Quotation Requested": 14,
        "Not Interested": 18,
    }
    if "bridal" in ctype:
        weights["Bridal Inquiry"] += 20
    if "gold" in ctype:
        weights["Gold Purchase"] += 15
    if "diamond" in ctype:
        weights["Diamond Purchase"] += 18
    if "walk" in source:
        weights["Appointment Booked"] += 8
    if "whatsapp" in source:
        weights["Quotation Requested"] += 6
    items = list(weights.items())
    total = sum(w for _, w in items)
    pick = random.uniform(0, total)
    upto = 0
    for name, w in items:
        upto += w
        if pick <= upto:
            return name
    return items[-1][0]


def _build_transcript(outcome: str, target: dict) -> str:
    lines = AGENCY_TRANSCRIPT_TEMPLATES.get(outcome, [])
    month = MONTH_NAMES[time.localtime().tm_mon - 1]
    city = target.get("city") or "your nearest showroom"
    name = target.get("name") or "ji"
    return "\n".join(
        f"{who}: {text.format(name=name.split()[0], month=month, city=city)}"
        for who, text in lines
    )


def _build_summary(outcome: str, target: dict) -> str:
    city = target.get("city") or "their city"
    return f"Spoke with {target.get('name')} ({city}). Outcome: {outcome}. {NEXT_ACTION_BY_OUTCOME[outcome]}."


def mock_dial(*, target: dict, campaign_prompt: Optional[str],
              lead_prompt_override: Optional[str]) -> CallResult:
    """Simulate full call lifecycle in one call. Returns CallResult.

    Connection rate ~75%, busy ~7%, no_answer ~13%, failed ~5%.
    """
    roll = random.random()
    if roll < 0.05:
        return CallResult(final_status="failed", duration=0, outcome=None,
                          sentiment=None, summary="Call did not connect (network error).",
                          transcript=None, lead_score=None,
                          next_action="Retry in next slot",
                          recording_url=None, call_cost=0.0)
    if roll < 0.12:
        return CallResult(final_status="busy", duration=0, outcome=None,
                          sentiment=None, summary="Line busy.", transcript=None,
                          lead_score=None, next_action="Retry tomorrow",
                          recording_url=None, call_cost=0.0)
    if roll < 0.25:
        return CallResult(final_status="no_answer", duration=20, outcome=None,
                          sentiment=None, summary="No answer after 4 rings.",
                          transcript=None, lead_score=None,
                          next_action="Try again later today",
                          recording_url=None, call_cost=0.0)

    # Connected
    outcome = _mock_outcome(target)
    duration = random.randint(55, 240) if outcome != "Not Interested" else random.randint(18, 45)
    transcript = _build_transcript(outcome, target)
    summary = _build_summary(outcome, target)
    score_lo, score_hi = LEAD_SCORE_BY_OUTCOME[outcome]
    lead_score = random.randint(score_lo, score_hi)
    callback_requested = (outcome not in ("Not Interested",)) and (random.random() < 0.18)
    if lead_prompt_override:
        summary += " | Personalised script used."
    elif campaign_prompt:
        summary += " | Campaign script used."
    recording_url = f"https://mock.parshwebcraft.com/recordings/{int(time.time())}-{target.get('phone','x')[-4:]}.mp3"
    return CallResult(
        final_status="completed",
        duration=duration,
        outcome=outcome,
        sentiment=SENTIMENT_BY_OUTCOME[outcome],
        summary=summary,
        transcript=transcript,
        lead_score=lead_score,
        next_action=NEXT_ACTION_BY_OUTCOME[outcome],
        recording_url=recording_url,
        call_cost=round(0.012 * duration, 4),
        callback_requested=callback_requested,
        vapi_call_id=None,
    )


# ---------------------------------------------------------------------------
# Provider selection — keeps Vapi as a drop-in for the future
# ---------------------------------------------------------------------------

def provider_name(db: Optional[Session] = None) -> str:
    return "vapi" if vapi_voice.is_configured(db) else "mock"


def dial(*, target: dict, campaign_prompt: Optional[str],
         lead_prompt_override: Optional[str], db: Optional[Session] = None) -> CallResult:
    """Place a call via the active provider and return the final result.

    For the mock provider we resolve the full lifecycle synchronously.
    For Vapi we kick off an outbound call and return immediately with status
    `dialing` and a vapi_call_id; the existing /api/voice/webhook will update
    the row when Vapi posts an end-of-call report. The engine treats anything
    other than `completed/failed/busy/no_answer` as "pending finalisation".
    """
    if provider_name(db) == "vapi":
        try:
            script = lead_prompt_override or campaign_prompt
            resp = vapi_voice.place_call(
                to_number=target["phone"],
                lead={
                    "name": target.get("name"),
                    "city": target.get("city"),
                    "customer_type": target.get("customer_type"),
                    "budget": target.get("budget") or 0,
                    "status": target.get("status") or "New",
                },
                script=script,
                db=db,
            )
            return CallResult(
                final_status="dialing",
                duration=0, outcome=None, sentiment=None,
                summary="Vapi outbound call initiated.",
                transcript=None, lead_score=None,
                next_action="Awaiting Vapi end-of-call webhook",
                recording_url=None, call_cost=0.0,
                vapi_call_id=resp.get("id"),
            )
        except Exception as e:  # noqa: BLE001
            logger.warning("Vapi dial failed, falling back to mock: %s", e)
    return mock_dial(target=target, campaign_prompt=campaign_prompt,
                     lead_prompt_override=lead_prompt_override)


def make_local_script(target: dict, campaign_prompt: Optional[str]) -> str:
    """Best-effort personalised script when no LLM key is available."""
    base = (campaign_prompt or
            "You are a warm ParshWebCraft digital agency sales consultant. "
            "Qualify interest (web design/mobile app/SEO), confirm city + budget, "
            "and book a discovery call or send a proposal estimate.")
    extras = []
    if target.get("name"):
        extras.append(f"Greet {target['name'].split()[0]} by first name.")
    if target.get("city"):
        extras.append(f"Reference {target['city']} showroom.")
    if target.get("customer_type"):
        extras.append(f"Lean into their {target['customer_type']} interest.")
    if target.get("notes"):
        extras.append(f"Context: {target['notes'][:160]}")
    return base + ("\n\nPersonalisation:\n- " + "\n- ".join(extras) if extras else "")
