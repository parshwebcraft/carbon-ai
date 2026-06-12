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

JEWELLERY_TRANSCRIPT_TEMPLATES = {
    "Bridal Inquiry": [
        ("Agent", "Hello {name}, this is Aanya from Facets Lifestyle Jewellery. Is this a good time?"),
        ("Customer", "Yes please."),
        ("Agent", "Lovely — congratulations on the upcoming wedding! Are you exploring a complete bridal set or specific pieces?"),
        ("Customer", "Looking for a full bridal set in 22K gold with diamond accents."),
        ("Agent", "Wonderful. What's the wedding date and your tentative budget?"),
        ("Customer", "Mid {month}. Budget is around eight to ten lakhs."),
        ("Agent", "I'll have our bridal stylist call you and share the latest catalogue. Shall I book a private showroom appointment at {city}?"),
        ("Customer", "Yes, that works."),
    ],
    "Gold Purchase": [
        ("Agent", "Namaste {name}, Aanya from Facets Lifestyle here."),
        ("Customer", "Hi, go ahead."),
        ("Agent", "We have new BIS-hallmarked 22K designs starting at low making charges this {month}. Are you considering chains, bangles, or a necklace?"),
        ("Customer", "Two bangles for my mother."),
        ("Agent", "Lovely gift. May I share a curated set of 5 designs on WhatsApp?"),
        ("Customer", "Sure."),
    ],
    "Diamond Purchase": [
        ("Agent", "Hello {name}, this is Aanya from Facets Lifestyle."),
        ("Customer", "Yes?"),
        ("Agent", "We have a limited collection of VVS solitaires for {month}. Are you looking at a ring, pendant, or studs?"),
        ("Customer", "A solitaire ring, IGI certified."),
        ("Agent", "Got it. May I send a price+certificate comparison on WhatsApp and reserve a private viewing in {city}?"),
        ("Customer", "Yes please."),
    ],
    "Exchange Inquiry": [
        ("Agent", "Hi {name}, calling from Facets Lifestyle. We have an old-gold exchange drive running."),
        ("Customer", "What's the rate?"),
        ("Agent", "We're offering ₹95 over market for hallmarked 22K and ₹85 over for non-hallmarked. Shall I block a slot at our {city} showroom for valuation?"),
        ("Customer", "Sounds reasonable, let's do it."),
    ],
    "Investment Gold": [
        ("Agent", "Hello {name}, this is Aanya. Calling about our Digital Gold + 22K coin plan."),
        ("Customer", "Tell me more."),
        ("Agent", "Lock current rate, monthly accumulation, and 11th month free. Most clients start at ₹5–10k/month. Comfortable?"),
        ("Customer", "Yes, send the details."),
    ],
    "Appointment Booked": [
        ("Agent", "Hi {name}, would you like to see the new bridal collection in person?"),
        ("Customer", "Yes, when can I come?"),
        ("Agent", "We have a private styling slot this weekend in {city}. Saturday 12pm?"),
        ("Customer", "Saturday 12pm works. Please book it."),
    ],
    "Quotation Requested": [
        ("Agent", "Hi {name}, following up on your enquiry."),
        ("Customer", "Yes, please send me a quotation for the necklace set we discussed."),
        ("Agent", "Will share within the hour with making + GST breakdown."),
    ],
    "Not Interested": [
        ("Agent", "Hello {name}, calling from Facets Lifestyle."),
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
    lines = JEWELLERY_TRANSCRIPT_TEMPLATES.get(outcome, [])
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
    recording_url = f"https://mock.facetscrm.com/recordings/{int(time.time())}-{target.get('phone','x')[-4:]}.mp3"
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

def provider_name() -> str:
    return "vapi" if vapi_voice.is_configured() else "mock"


def dial(*, target: dict, campaign_prompt: Optional[str],
         lead_prompt_override: Optional[str]) -> CallResult:
    """Place a call via the active provider and return the final result.

    For the mock provider we resolve the full lifecycle synchronously.
    For Vapi we kick off an outbound call and return immediately with status
    `dialing` and a vapi_call_id; the existing /api/voice/webhook will update
    the row when Vapi posts an end-of-call report. The engine treats anything
    other than `completed/failed/busy/no_answer` as "pending finalisation".
    """
    if provider_name() == "vapi":
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
            "You are a warm Facets Lifestyle Jewellery sales consultant. "
            "Qualify interest (gold/diamond/bridal), confirm city + budget, "
            "and book a showroom visit or send a quotation.")
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
