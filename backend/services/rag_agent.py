"""RAG (Retrieval-Augmented Generation) Agent for Facets Lifestyle Jewellery CRM.

Assembles rich context from the database (lead profile, history, products,
past conversations) and passes it to DeepSeek for grounded AI suggestions.

This is the brain of the Phase 4 Voice AI pipeline.
"""
from __future__ import annotations

import logging
from typing import Optional
from sqlalchemy.orm import Session

from services import deepseek

logger = logging.getLogger("facets.rag")

# ── RAG System Prompt ─────────────────────────────────────────────────────────

RAG_SYSTEM = (
    "You are an expert AI Sales Copilot for Facets Lifestyle, a premium Indian jewellery brand. "
    "You have full access to the customer's CRM history, product catalogue, and live conversation. "
    "Your suggestions are grounded in REAL data — never hallucinate prices or products. "
    "Be concise, actionable, and culturally aware of Indian jewellery buying psychology. "
    "Always respond in INR. Prioritise: Bridal > Diamond > Gold > General enquiry in urgency. "
    "Every suggestion must be under 30 words unless instructed otherwise."
)


# ── Context Builder ───────────────────────────────────────────────────────────

def build_context(lead_id: int, db: Session) -> dict:
    """Pull all relevant context for a lead from the database.

    Returns a dict with: lead, insight, activities, calls, whatsapp, products
    """
    from models import Lead, LeadInsight, Activity, Call, WhatsappMessage, Product

    # Lead profile
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        return {}

    lead_dict = {
        "name": lead.name,
        "phone": lead.phone,
        "city": lead.city,
        "source": lead.source,
        "status": lead.status,
        "budget": lead.budget,
        "customer_type": lead.customer_type,
        "notes": lead.notes,
    }

    # AI insight (if exists from previous scoring)
    insight = db.query(LeadInsight).filter(LeadInsight.lead_id == lead_id).first()
    insight_dict = {}
    if insight:
        insight_dict = {
            "lead_score":     getattr(insight, "lead_score", 0),
            "intent":         getattr(insight, "intent", None),
            "budget":         getattr(insight, "budget", None),
            "timeline":       getattr(insight, "timeline", None),
            "decision_maker": getattr(insight, "decision_maker", None),
            "summary":        getattr(insight, "summary", None),
        }

    # Recent activities (last 10)
    activities = (
        db.query(Activity)
        .filter(Activity.lead_id == lead_id)
        .order_by(Activity.created_at.desc())
        .limit(10).all()
    )
    activities_list = [
        {"type": a.activity_type, "description": a.description,
         "date": a.created_at.strftime("%Y-%m-%d") if a.created_at else ""}
        for a in activities
    ]

    # Past calls (last 5)
    calls = (
        db.query(Call)
        .filter(Call.lead_id == lead_id)
        .order_by(Call.created_at.desc())
        .limit(5).all()
    )
    calls_list = [
        {"status": c.call_status, "duration": c.call_duration,
         "summary": c.call_summary, "sentiment": c.sentiment,
         "date": c.created_at.strftime("%Y-%m-%d") if c.created_at else ""}
        for c in calls
    ]

    # Last 10 WhatsApp messages
    whatsapp = (
        db.query(WhatsappMessage)
        .filter(WhatsappMessage.lead_id == lead_id)
        .order_by(WhatsappMessage.created_at.asc())
        .limit(10).all()
    )
    whatsapp_list = [
        {"direction": m.direction, "message": m.message}
        for m in whatsapp
    ]

    # Relevant products from catalogue (filter by budget range)
    budget = lead.budget or 0
    budget_min = max(0, budget * 0.3)
    budget_max = budget * 2.5 if budget > 0 else 9999999
    products = (
        db.query(Product)
        .filter(Product.is_active == True)  # noqa: E712
        .limit(30).all()
    )
    products_list = [
        {
            "id": p.id,
            "product_name": p.product_name,
            "metal_type": getattr(p, "metal_type", ""),
            "category": getattr(p, "category", ""),
            "price": getattr(p, "price", 0),
            "description": getattr(p, "description", "")[:100],
        }
        for p in products
    ]

    return {
        "lead": lead_dict,
        "insight": insight_dict,
        "activities": activities_list,
        "calls": calls_list,
        "whatsapp": whatsapp_list,
        "products": products_list,
    }


def _format_context_prompt(context: dict, transcript_lines: list[str]) -> str:
    """Build the full RAG prompt from context + live transcript."""
    lead = context.get("lead", {})
    insight = context.get("insight", {})
    activities = context.get("activities", [])
    calls = context.get("calls", [])
    whatsapp = context.get("whatsapp", [])
    products = context.get("products", [])

    # Lead profile section
    lead_section = (
        f"CUSTOMER PROFILE:\n"
        f"  Name: {lead.get('name', 'Unknown')}\n"
        f"  City: {lead.get('city') or 'Unknown'}\n"
        f"  Interest: {lead.get('customer_type') or 'General'}\n"
        f"  Budget: ₹{int(lead.get('budget') or 0):,}\n"
        f"  Status: {lead.get('status') or 'New'}\n"
        f"  Source: {lead.get('source') or 'Unknown'}\n"
        f"  Notes: {lead.get('notes') or 'None'}"
    )

    # AI insight section
    insight_section = ""
    if insight:
        insight_section = (
            f"\nAI PROFILE (from previous analysis):\n"
            f"  Score: {insight.get('lead_score', 'N/A')}/100\n"
            f"  Intent: {insight.get('intent', 'Unknown')}\n"
            f"  Budget Qualified: {insight.get('budget_qualification', 'Unknown')}\n"
            f"  Need: {insight.get('need', 'Unknown')}\n"
            f"  Timeline: {insight.get('timeline', 'Unknown')}"
        )

    # Past interactions section
    history_lines = []
    if calls:
        history_lines.append("PAST CALLS:")
        for c in calls[:3]:
            history_lines.append(
                f"  [{c['date']}] {c['status']} ({c['duration']}s) — {c['summary'] or 'No summary'}"
                + (f" | Sentiment: {c['sentiment']}" if c.get("sentiment") else "")
            )
    if whatsapp:
        history_lines.append("WHATSAPP HISTORY (recent):")
        for m in whatsapp[-6:]:
            who = "Customer" if m["direction"] == "in" else "Agent"
            history_lines.append(f"  {who}: {m['message'][:120]}")
    if activities:
        history_lines.append("RECENT ACTIVITIES:")
        for a in activities[:5]:
            history_lines.append(f"  [{a['date']}] {a['type']}: {a['description'][:100]}")
    history_section = "\n".join(history_lines) if history_lines else "No prior interactions."

    # Products section (relevant to budget & interest)
    interest = (lead.get("customer_type") or "").lower()
    relevant_products = [
        p for p in products
        if any(kw in (p.get("product_name", "") + p.get("metal_type", "") + p.get("category", "")).lower()
               for kw in (["bridal", "wedding"] if "bridal" in interest else
                          ["diamond"] if "diamond" in interest else
                          ["gold"] if "gold" in interest else ["gold", "diamond"]))
    ][:8] or products[:8]

    product_lines = [
        f"  [{p['id']}] {p['product_name']} ({p.get('metal_type','')}, {p.get('category','')}) — ₹{int(p.get('price', 0)):,}"
        for p in relevant_products
    ]
    products_section = "RELEVANT PRODUCTS FROM CATALOGUE:\n" + "\n".join(product_lines) if product_lines else ""

    # Live transcript section
    transcript_text = "\n".join(transcript_lines[-20:]) if transcript_lines else "(Conversation just started)"
    transcript_section = f"LIVE CONVERSATION (current session):\n{transcript_text}"

    full_prompt = f"""{lead_section}
{insight_section}

{history_section}

{products_section}

{transcript_section}

Based on ALL the above context, analyse this conversation and respond ONLY with a JSON object with EXACTLY these keys:
- next_question: best question salesperson should ask now (max 25 words)
- product_suggestion: specific product from catalogue to recommend with product_id (max 30 words)
- offer_suggestion: compelling offer or incentive to mention now (max 25 words)
- objection_handling: how to handle any hesitation or objection expressed (max 30 words)
- closing_suggestion: closing technique most likely to work for this customer (max 25 words)
- lead_score: updated score 0-100 based on this conversation
- intent: one of [Bridal, Gold Purchase, Diamond Purchase, Investment, Gift, Browse, Unknown]
- budget: estimated budget in INR as integer
- timeline: one of [Immediate, Within 1 Month, 1-3 Months, 3-6 Months, Unknown]
- decision_maker: one of [Yes, No, Needs Spouse, Needs Family, Unknown]
- live_alert: urgent action if customer is about to leave or commit (max 20 words, or null)"""

    return full_prompt


# ── Main RAG analysis function ────────────────────────────────────────────────

def analyse_with_rag(
    lead_id: int,
    db: Session,
    transcript_lines: list[str],
    *,
    context: Optional[dict] = None,  # pre-built context (cache across calls)
) -> dict:
    """Run full RAG analysis: build context → DeepSeek → structured suggestions.

    Args:
        lead_id: Lead being analysed
        db: SQLAlchemy session
        transcript_lines: Live conversation so far (e.g. ["Customer: I want bridal set", ...])
        context: Optional pre-built context dict (pass to avoid re-fetching on every update)

    Returns:
        dict with all suggestion keys + lead_score, intent, etc.
    """
    if context is None:
        context = build_context(lead_id, db)

    if not context:
        return _fallback_response("Lead not found")

    prompt = _format_context_prompt(context, transcript_lines)

    try:
        result = deepseek.chat_json(
            [
                {"role": "system", "content": RAG_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=700,
        )
        return result
    except deepseek.DeepSeekNotConfigured as e:
        return _fallback_response(str(e))
    except Exception as e:  # noqa: BLE001
        logger.error("RAG analysis error: %s", e)
        return _fallback_response(f"AI error: {e}")


def _fallback_response(reason: str) -> dict:
    return {
        "next_question": "What is the occasion you are shopping for today?",
        "product_suggestion": "Show our bestselling bridal sets in the customer's budget range.",
        "offer_suggestion": "Mention our complimentary engraving + free resize service.",
        "objection_handling": "Acknowledge their concern and offer to customise weight or design.",
        "closing_suggestion": "Suggest booking a private appointment for a personalised showcase.",
        "lead_score": 50,
        "intent": "Unknown",
        "budget": 0,
        "timeline": "Unknown",
        "decision_maker": "Unknown",
        "live_alert": None,
        "_fallback": True,
        "_reason": reason,
    }
