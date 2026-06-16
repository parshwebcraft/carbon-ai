"""AI Copilot service — DeepSeek-powered suggestions for live sales conversations."""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from typing import Optional

from services import deepseek

DB_PATH = "backend/facets.db"

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
    try:
        raw["lead_score"] = max(0, min(100, int(raw["lead_score"])))
    except (TypeError, ValueError):
        raw["lead_score"] = 0
    return raw


# ── Product recommendation ───────────────────────────────────────────────────

def recommend_products(transcript: list[dict], products: list[dict]) -> list[dict]:
    """Match products from the catalogue to customer signals in transcript."""
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

    top = [p for _, p in sorted(scored, key=lambda x: -x[0])[:3]]

    if not top:
        top = sorted(products, key=lambda p: p.get("price", 0))[:3]

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


# ── WhatsApp thread intelligence ─────────────────────────────────────────────

WHATSAPP_SYSTEM = (
    "You are a CRM analyst for Facets Lifestyle premium jewellery. "
    "Analyse WhatsApp conversations between the sales agent and customers. "
    "Be concise, data-driven, and focused on actionable sales intelligence."
)


def analyse_whatsapp_thread(messages: list[dict], lead: dict) -> dict:
    """Deep analysis of a WhatsApp thread."""
    lines = "\n".join(
        f"{'Customer' if m.get('direction') == 'in' else 'Agent'}: {m.get('message', '')}"
        for m in messages[-20:]
    )
    prompt = (
        f"Lead: {lead.get('name')}, {lead.get('customer_type')}, "
        f"Budget ₹{int(lead.get('budget') or 0):,}, Status: {lead.get('status')}\n\n"
        f"WhatsApp conversation:\n{lines}\n\n"
        "Respond ONLY with JSON having these exact keys:\n"
        "- intent: customer's purchase intent (e.g. 'Bridal Necklace', 'Unknown')\n"
        "- sentiment: Positive | Neutral | Negative\n"
        "- objections: list of up to 3 objections as a comma-separated string\n"
        "- conversion_probability: integer 0-100\n"
        "- next_action: single best next step for the sales agent (max 20 words)\n"
        "- summary: 1-sentence conversation summary"
    )
    try:
        result = deepseek.chat_json(
            [
                {"role": "system", "content": WHATSAPP_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=350,
        )
    except Exception:  # noqa: BLE001
        result = {}

    defaults = {
        "intent": "Unknown", "sentiment": "Neutral", "objections": "",
        "conversion_probability": 0, "next_action": "Follow up with customer",
        "summary": "No summary available",
    }
    for k, v in defaults.items():
        if k not in result or result[k] is None:
            result[k] = v
    try:
        result["conversion_probability"] = max(0, min(100, int(result["conversion_probability"])))
    except (TypeError, ValueError):
        result["conversion_probability"] = 0
    return result


# ── Batch lead scoring ────────────────────────────────────────────────────────

def score_lead_quick(lead: dict, activities: list[dict]) -> dict:
    """Quick AI scoring for a single lead using profile + activity history."""
    act_lines = "\n".join(
        f"- [{a.get('activity_type')}] {(a.get('description') or '')[:80]}"
        for a in activities[:8]
    )
    prompt = (
        f"Score this jewellery lead for sales priority:\n"
        f"Name: {lead.get('name')}, City: {lead.get('city')}, "
        f"Interest: {lead.get('customer_type')}, Status: {lead.get('status')}, "
        f"Budget: ₹{int(lead.get('budget') or 0):,}\n"
        f"Recent activity:\n{act_lines or '(none)'}\n\n"
        "Respond ONLY with JSON:\n"
        "- lead_score: integer 0-100\n"
        "- intent: purchase intent string\n"
        "- budget: budget range string\n"
        "- timeline: purchase timeline string\n"
        "- decision_maker: who decides\n"
        "- conversion_probability: integer 0-100"
    )
    try:
        result = deepseek.chat_json(
            [
                {"role": "system", "content": COPILOT_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=250,
        )
    except Exception:  # noqa: BLE001
        result = {}

    defaults = {
        "lead_score": 30, "intent": "Unknown", "budget": "Unknown",
        "timeline": "Unknown", "decision_maker": "Unknown", "conversion_probability": 30,
    }
    for k, v in defaults.items():
        if k not in result or result[k] is None:
            result[k] = v
    for int_key in ("lead_score", "conversion_probability"):
        try:
            result[int_key] = max(0, min(100, int(result[int_key])))
        except (TypeError, ValueError):
            result[int_key] = defaults[int_key]
    return result


# ── Follow-up suggestion engine ───────────────────────────────────────────────

FOLLOWUP_SYSTEM = (
    "You are a senior jewellery sales coach at Facets Lifestyle. "
    "Your job is to create specific, personalised follow-up action plans for sales reps. "
    "Be direct, actionable, and specific to each customer's jewellery interests."
)


def generate_follow_up_suggestions(stale_leads: list[dict]) -> list[dict]:
    """Given a list of stale leads, generate personalized follow-up actions."""
    if not stale_leads:
        return []

    lead_summaries = "\n".join(
        f"{i+1}. ID={l['id']}, Name={l['name']}, "
        f"Interest={l.get('customer_type','Unknown')}, "
        f"Budget=₹{int(l.get('budget') or 0):,}, "
        f"Status={l.get('status')}, "
        f"Silent for {l.get('last_activity_days', '?')} days"
        for i, l in enumerate(stale_leads[:15])
    )

    prompt = (
        f"Generate follow-up suggestions for these {len(stale_leads[:15])} stale jewellery leads.\n\n"
        f"{lead_summaries}\n\n"
        "For each lead, respond with a JSON array of objects with:\n"
        "- lead_id: (from the ID= field)\n"
        "- priority: High | Medium | Low\n"
        "- message: personalised WhatsApp/call message to send (max 40 words, Indian English)\n"
        "- action_type: WhatsApp | Call | Email\n"
        "\nRespond ONLY with the JSON array."
    )
    try:
        raw = deepseek.chat(
            [
                {"role": "system", "content": FOLLOWUP_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
            max_tokens=1200,
        )
        import json as _json
        start = raw.find("[")
        end = raw.rfind("]")
        if start >= 0 and end > start:
            suggestions = _json.loads(raw[start:end + 1])
        else:
            suggestions = []
    except Exception:  # noqa: BLE001
        suggestions = []

    lead_map = {l["id"]: l for l in stale_leads}
    result = []
    for s in suggestions:
        lid = s.get("lead_id")
        lead_info = lead_map.get(lid, {})
        result.append({
            "lead_id": lid,
            "lead_name": lead_info.get("name", "Unknown"),
            "days_stale": lead_info.get("last_activity_days", 0),
            "status": lead_info.get("status", ""),
            "customer_type": lead_info.get("customer_type", ""),
            "budget": lead_info.get("budget", 0),
            "priority": s.get("priority", "Medium"),
            "message": s.get("message", ""),
            "action_type": s.get("action_type", "WhatsApp"),
        })
    return result


# ── Analytical Direct Storage Tracing (Our 5 Custom Logging Tables) ───────────

def save_conversation_memory(lead_id: int, interaction_type: str, raw_transcript: str, ai_summary: str) -> int:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO conversation_memory (lead_id, interaction_type, raw_transcript, ai_summary, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (lead_id, interaction_type, raw_transcript, ai_summary, datetime.utcnow().isoformat())
        )
        conn.commit()
        return cursor.lastrowid or 0
    except Exception as e:
        print(f"Telemetry Exception (conversation_memory): {e}")
        return 0
    finally:
        conn.close()


def save_transcript_chunk(memory_id: int, speaker: str, content: str, sequence_order: int):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO transcript_chunks (memory_id, speaker, content, sequence_order)
            VALUES (?, ?, ?, ?)
            """,
            (memory_id, speaker, content, sequence_order)
        )
        conn.commit()
    except Exception as e:
        print(f"Telemetry Exception (transcript_chunks): {e}")
    finally:
        conn.close()


def save_intent_log(lead_id: int, detected_intent: str, confidence_score: float, structural_meta: dict):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO intent_logs (lead_id, detected_intent, confidence_score, structural_meta, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (lead_id, detected_intent, confidence_score, json.dumps(structural_meta), datetime.utcnow().isoformat())
        )
        conn.commit()
    except Exception as e:
        print(f"Telemetry Exception (intent_logs): {e}")
    finally:
        conn.close()


def save_retrieval_log(memory_id: int, retrieval_type: str, query_string: str, results_count: int):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO retrieval_logs (memory_id, retrieval_type, query_string, results_count, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (memory_id, retrieval_type, query_string, results_count, datetime.utcnow().isoformat())
        )
        conn.commit()
    except Exception as e:
        print(f"Telemetry Exception (retrieval_logs): {e}")
    finally:
        conn.close()


def update_ai_feedback(log_id: int, table_target: str, is_positive: bool, correction_note: Optional[str] = None):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO ai_feedback (log_id, table_target, is_positive, correction_note, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (log_id, table_target, 1 if is_positive else 0, correction_note, datetime.utcnow().isoformat())
        )
        conn.commit()
    except Exception as e:
        print(f"Telemetry Exception (ai_feedback): {e}")
    finally:
        conn.close()