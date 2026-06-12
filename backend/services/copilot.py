"""AI Copilot service — DeepSeek-powered suggestions for live sales conversations."""
from __future__ import annotations

import json
from typing import Optional

from services import deepseek

# ── System prompt ────────────────────────────────────────────────────────────
COPILOT_SYSTEM = (
    "You are an expert AI Sales Copilot for Facets Lifestyle, a premium Indian jewellery brand. "
    "Your job is to assist the salesperson in real-time during a customer conversation. "
    "You are concise, actionable, and deeply familiar with gold (22K/18K), diamond, platinum, "
    "bridal jewellery, and Indian customer psychology. Always respond in INR. "
    "Keep every suggestion under 30 words unless instructed otherwise."
)

HISTORY_SYSTEM = (
    "You are a CRM analyst for Facets Lifestyle jewellery. "
    "Summarise a customer's history in crisp bullet points. "
    "Focus on: last interaction, stated interest, objections raised, conversion probability. "
    "Keep total response under 120 words."
)


# ── Core copilot suggestion engine ───────────────────────────────────────────

def generate_copilot_suggestions(
    transcript: list[dict],   # [{speaker, content}]
    lead: Optional[dict] = None,
    products: Optional[list[dict]] = None,
) -> dict:
    """
    Given the current transcript, return a full copilot analysis JSON:
    {
        next_question, product_suggestion, offer_suggestion,
        objection_handling, closing_suggestion,
        lead_score (0-100), intent, budget, timeline, decision_maker
    }
    """
    # Build transcript text
    convo_lines = "\n".join(
        f"{m['speaker']}: {m['content']}" for m in transcript[-20:]
    )

    # Build product catalogue snippet (top 10 by price relevance)
    product_snippet = ""
    if products:
        lines = [
            f"- {p['product_name']} ({p.get('metal_type','')}, {p.get('category','')}): ₹{int(p.get('price', 0)):,}"
            for p in products[:10]
        ]
        product_snippet = "Available products:\n" + "\n".join(lines)

    # Build lead profile
    lead_profile = ""
    if lead:
        lead_profile = (
            f"Lead profile: {lead.get('name','Customer')}, "
            f"Budget ₹{int(lead.get('budget') or 0):,}, "
            f"Interest: {lead.get('customer_type') or 'Unknown'}, "
            f"Status: {lead.get('status') or 'New'}, "
            f"City: {lead.get('city') or 'Unknown'}"
        )

    prompt = f"""
Analyse this live jewellery sales conversation and respond ONLY with a JSON object.

{lead_profile}

{product_snippet}

Conversation transcript:
{convo_lines}

Return JSON with EXACTLY these keys (all required):
- next_question: best question the salesperson should ask next (max 25 words)
- product_suggestion: specific product to recommend based on customer signals (max 30 words)
- offer_suggestion: a compelling offer or incentive to mention now (max 25 words)
- objection_handling: how to address any objection or hesitation expressed (max 30 words)
- closing_suggestion: best closing move for this stage of conversation (max 25 words)
- lead_score: integer 0-100 based on BANT (Budget, Authority, Need, Timeline)
- intent: primary purchase intent (e.g. "Bridal Necklace", "Anniversary Gift", "Investment")
- budget: estimated or stated budget (e.g. "₹1,50,000 - ₹2,00,000")
- timeline: purchase timeline (e.g. "Within 30 days", "3-6 months", "Unknown")
- decision_maker: who decides (e.g. "Customer", "Couple", "Family", "Unknown")

Respond ONLY with the JSON object, no markdown, no explanation.
"""
    try:
        result = deepseek.chat_json(
            [
                {"role": "system", "content": COPILOT_SYSTEM},
                {"role": "user", "content": prompt.strip()},
            ],
            temperature=0.3,
            max_tokens=700,
        )
    except deepseek.DeepSeekNotConfigured:
        # Return a helpful placeholder when API key is not configured
        result = _placeholder_suggestions()
    except Exception:  # noqa: BLE001
        result = _placeholder_suggestions()

    return _normalise(result)


def _placeholder_suggestions() -> dict:
    return {
        "next_question": "What occasion are you shopping for today?",
        "product_suggestion": "Our Bridal Collection Set — hallmark certified, beautifully crafted.",
        "offer_suggestion": "We can offer complimentary gift packaging and a 5% making charge discount.",
        "objection_handling": "Our pieces come with BIS hallmark certification and a lifetime buy-back guarantee.",
        "closing_suggestion": "Would you like to book a private viewing at our showroom this weekend?",
        "lead_score": 45,
        "intent": "Unknown",
        "budget": "Unknown",
        "timeline": "Unknown",
        "decision_maker": "Unknown",
    }


def _normalise(raw: dict) -> dict:
    """Ensure all required keys exist with sane defaults."""
    defaults = {
        "next_question": "",
        "product_suggestion": "",
        "offer_suggestion": "",
        "objection_handling": "",
        "closing_suggestion": "",
        "lead_score": 0,
        "intent": "Unknown",
        "budget": "Unknown",
        "timeline": "Unknown",
        "decision_maker": "Unknown",
    }
    for k, v in defaults.items():
        if k not in raw or raw[k] is None:
            raw[k] = v
    # Clamp lead_score
    try:
        raw["lead_score"] = max(0, min(100, int(raw["lead_score"])))
    except (TypeError, ValueError):
        raw["lead_score"] = 0
    return raw


# ── Product recommendation ───────────────────────────────────────────────────

def recommend_products(transcript: list[dict], products: list[dict]) -> list[dict]:
    """
    Match products from the catalogue to customer signals in transcript.
    Returns up to 3 products with a 'reason' field added.
    """
    convo = " ".join(m["content"].lower() for m in transcript[-10:])

    KEYWORDS = {
        "bridal": ["bridal", "wedding", "shaadi", "marriage"],
        "ring": ["ring", "engagement", "solitaire"],
        "necklace": ["necklace", "haar", "chain"],
        "diamond": ["diamond", "hira"],
        "gold": ["gold", "sone"],
        "budget_high": ["lakh", "2 lakh", "3 lakh", "50000", "100000"],
    }

    matched_categories: list[str] = []
    for cat, kws in KEYWORDS.items():
        if any(kw in convo for kw in kws):
            matched_categories.append(cat)

    # Score products
    scored: list[tuple[int, dict]] = []
    for p in products:
        score = 0
        name_lower = (p.get("product_name") or "").lower()
        cat_lower = (p.get("category") or "").lower()
        metal_lower = (p.get("metal_type") or "").lower()

        if "bridal" in matched_categories and ("bridal" in name_lower or "bridal" in cat_lower):
            score += 3
        if "ring" in matched_categories and "ring" in name_lower:
            score += 2
        if "necklace" in matched_categories and ("necklace" in name_lower or "chain" in name_lower):
            score += 2
        if "diamond" in matched_categories and "diamond" in metal_lower:
            score += 2
        if "gold" in matched_categories and "gold" in metal_lower:
            score += 1
        if score > 0:
            scored.append((score, p))

    # Sort and pick top 3
    top = [p for _, p in sorted(scored, key=lambda x: -x[0])[:3]]

    # If nothing matched, return cheapest 3
    if not top:
        top = sorted(products, key=lambda p: p.get("price", 0))[:3]

    # Attach a brief reason
    reasons = [
        "Matches customer's stated interest",
        "Popular choice for this occasion",
        "Excellent value in stated budget",
    ]
    for i, p in enumerate(top):
        p = dict(p)
        p["reason"] = reasons[i] if i < len(reasons) else "Recommended by AI"
        top[i] = p

    return top


# ── Customer history summary ─────────────────────────────────────────────────

def generate_history_summary(
    lead: dict,
    whatsapp: list[dict],
    calls: list[dict],
    activities: list[dict],
) -> str:
    """Generate a concise AI summary of all past customer interactions."""
    wa_lines = "\n".join(
        f"  [{m.get('direction','?')}] {m.get('message','')[:80]}"
        for m in whatsapp[-8:]
    )
    call_lines = "\n".join(
        f"  Call {c.get('call_status','')} {c.get('call_duration',0)}s — {(c.get('call_summary') or '')[:80]}"
        for c in calls[-5:]
    )
    act_lines = "\n".join(
        f"  [{a.get('activity_type','')}] {(a.get('description') or '')[:80]}"
        for a in activities[-8:]
    )

    prompt = (
        f"Customer: {lead.get('name')}, {lead.get('city')}, "
        f"Budget ₹{int(lead.get('budget') or 0):,}, Type: {lead.get('customer_type')}, "
        f"Status: {lead.get('status')}\n\n"
        f"WhatsApp messages:\n{wa_lines or '(none)'}\n\n"
        f"Call history:\n{call_lines or '(none)'}\n\n"
        f"Activities:\n{act_lines or '(none)'}\n\n"
        "Write a 4-bullet summary: Last Interaction, Stated Interest, Key Objections, Conversion Probability."
    )
    try:
        return deepseek.chat(
            [
                {"role": "system", "content": HISTORY_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            temperature=0.25,
            max_tokens=200,
        ).strip()
    except Exception:  # noqa: BLE001
        return "AI summary unavailable — configure DEEPSEEK_API_KEY."
