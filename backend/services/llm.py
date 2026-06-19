"""Unified LLM service provider (OpenAI ChatGPT & DeepSeek) used by AI features."""
import os
import json
import logging
from typing import List, Dict, Optional
from openai import OpenAI

logger = logging.getLogger("facets.llm")


class LlmNotConfigured(RuntimeError):
    pass


# Backward compatibility alias
DeepSeekNotConfigured = LlmNotConfigured

PROVIDER = os.environ.get("LLM_PROVIDER", "openai").lower().strip()


def _get_client():
    if PROVIDER == "deepseek":
        api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
        if not api_key:
            raise LlmNotConfigured(
                "DEEPSEEK_API_KEY is not set. Add it to /app/backend/.env."
            )
        base_url = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com").strip()
        model = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat").strip()
        return OpenAI(api_key=api_key, base_url=base_url), model
    else:
        # Default to OpenAI
        api_key = os.environ.get("OPENAI_API_KEY", "").strip()
        if not api_key:
            raise LlmNotConfigured(
                "OPENAI_API_KEY is not set. Add it to /app/backend/.env."
            )
        base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").strip()
        model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini").strip()
        return OpenAI(api_key=api_key, base_url=base_url), model


def chat(messages: List[Dict[str, str]], *, temperature: float = 0.4,
         max_tokens: int = 600, response_format: Optional[str] = None) -> str:
    """Return the assistant text from a chat completion using the configured provider."""
    client, model = _get_client()

    kwargs = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    if response_format == "json":
        kwargs["response_format"] = {"type": "json_object"}

    try:
        response = client.chat.completions.create(**kwargs)
        content = response.choices[0].message.content
        if content is None:
            return ""
        return content
    except Exception as e:
        logger.error(
            "LLM completion failed (provider=%s, model=%s): %s",
            PROVIDER, model, e
        )
        raise RuntimeError(f"LLM completion error: {e}") from e


def chat_json(messages: List[Dict[str, str]], **kw) -> dict:
    """Same as chat() but asks for JSON and parses it."""
    raw = chat(messages, response_format="json", **kw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Best-effort: find first {...} block
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            return json.loads(raw[start:end + 1])
        raise


# ---- Domain helpers (Jewellery CRM) ----

JEWELLERY_SYSTEM = (
    "You are an experienced sales consultant for Facets Lifestyle, a premium Indian jewellery brand "
    "selling gold (22K/18K), diamond, platinum and bridal pieces. "
    "Be warm, concise, polite, and use polite Indian English. "
    "Always speak in INR. Never make up product prices. "
    "Keep WhatsApp replies under 60 words and end with a clear next step "
    "(showroom visit, video consultation, sharing catalogue, or sending quotation)."
)


def whatsapp_reply(lead: dict, history: list[dict]) -> str:
    """Generate a contextual WhatsApp reply for a lead.

    history: [{direction:"in|out", message:"..."}] oldest first.
    """
    convo_lines = []
    for m in history[-12:]:
        who = "Customer" if m["direction"] == "in" else "Agent"
        convo_lines.append(f"{who}: {m['message']}")

    user_prompt = (
        f"Lead profile:\n"
        f"- Name: {lead.get('name', 'Customer')}\n"
        f"- City: {lead.get('city') or 'Unknown'}\n"
        f"- Interest: {lead.get('customer_type') or 'General'}\n"
        f"- Budget: ₹{int(lead.get('budget') or 0):,}\n"
        f"- Status: {lead.get('status') or 'New'}\n\n"
        f"Conversation so far:\n" + "\n".join(convo_lines) +
        "\n\nWrite ONLY the next agent reply, no preamble."
    )
    return chat([
        {"role": "system", "content": JEWELLERY_SYSTEM},
        {"role": "user", "content": user_prompt},
    ], temperature=0.6, max_tokens=200).strip()


def call_insights(call: dict, lead: dict) -> dict:
    """Return {summary, sentiment, next_action} for a call log."""
    prompt = (
        "Analyse this jewellery sales call and respond ONLY with JSON having keys "
        "summary (1-2 sentences), sentiment (Positive|Neutral|Negative), "
        "next_action (one specific concrete step).\n\n"
        f"Lead: {lead.get('name')} ({lead.get('customer_type')}) — "
        f"status {lead.get('status')}, budget ₹{int(lead.get('budget') or 0):,}.\n"
        f"Call status: {call.get('call_status')}. Duration: {call.get('call_duration')}s.\n"
        f"Raw summary: {call.get('call_summary') or '(none)'}\n"
        f"Transcript: {call.get('transcript') or '(no transcript available)'}"
    )
    return chat_json([
        {"role": "system", "content": JEWELLERY_SYSTEM},
        {"role": "user", "content": prompt},
    ], temperature=0.2, max_tokens=350)


def call_script(lead: dict, history: list[dict]) -> str:
    """Suggest a 90-second call script tailored to the lead."""
    activity_lines = [f"- [{a['activity_type']}] {a['description']}" for a in history[:8]]
    prompt = (
        f"Draft a 90-second outbound call script for a Facets Lifestyle sales consultant calling:\n"
        f"- Name: {lead.get('name')}\n- City: {lead.get('city')}\n"
        f"- Interest: {lead.get('customer_type')}\n- Budget: ₹{int(lead.get('budget') or 0):,}\n"
        f"- Status: {lead.get('status')}\n\nRecent activities:\n"
        + ("\n".join(activity_lines) or "(no prior activity)")
        + "\n\nFormat with sections: Opening, Discovery (3 questions), Value Pitch, Next Step. "
          "Keep total under 220 words."
    )
    return chat([
        {"role": "system", "content": JEWELLERY_SYSTEM},
        {"role": "user", "content": prompt},
    ], temperature=0.5, max_tokens=500).strip()


def followup_message(lead: dict, history: list[dict]) -> str:
    last = next((m["message"] for m in reversed(history) if m["direction"] == "in"), None)
    prompt = (
        "Write a short polite WhatsApp follow-up (max 35 words) checking back with a customer "
        "who went silent. Add a soft call-to-action.\n"
        f"Lead: {lead.get('name')} ({lead.get('customer_type')}) — interested in "
        f"{lead.get('status')}.\n"
        f"Their last message: {last or '(none)'}"
    )
    return chat([
        {"role": "system", "content": JEWELLERY_SYSTEM},
        {"role": "user", "content": prompt},
    ], temperature=0.6, max_tokens=120).strip()


def dashboard_briefing(stats: dict) -> str:
    """Generate a concise AI morning briefing for the sales manager dashboard."""
    prompt = (
        "You are an AI sales coach for Facets Lifestyle jewellery. "
        "Write a crisp 3-sentence morning briefing for the sales team based on these CRM stats. "
        "Be motivating, specific, and action-oriented. Mention key numbers.\n\n"
        f"Pipeline stats:\n"
        f"- Total Leads: {stats.get('total_leads', 0)}\n"
        f"- New Leads Today: {stats.get('new_leads', 0)}\n"
        f"- Open Tasks: {stats.get('open_tasks', 0)}\n"
        f"- Pipeline Value: ₹{int(stats.get('pipeline_value', 0)):,}\n"
        f"- Won Revenue: ₹{int(stats.get('won_value', 0)):,}\n"
        f"- Task Completion Rate: {stats.get('task_completion_rate', 0)}%\n"
        f"- Hot Leads (score ≥75): {stats.get('hot_lead_count', 0)}\n"
        f"- Stale Leads (7+ days silent): {stats.get('stale_lead_count', 0)}\n"
        "\nWrite ONLY the 3-sentence briefing, no headings or bullet points."
    )
    return chat([
        {"role": "system", "content": JEWELLERY_SYSTEM},
        {"role": "user", "content": prompt},
    ], temperature=0.7, max_tokens=200).strip()


def campaign_draft(campaign_name: str, segment: str, tone: str, product_hint: str = "") -> str:
    """Draft a WhatsApp/SMS campaign message for the given segment and tone."""
    tone_guide = {
        "Professional": "formal, respectful, business-like",
        "Festive":      "warm, celebratory, festive (mention occasion if given)",
        "Urgent":       "time-sensitive, FOMO-inducing, clear deadline",
        "Friendly":     "casual, personal, conversational",
    }.get(tone, "warm and professional")

    prompt = (
        f"Draft a WhatsApp outreach message for a jewellery sales campaign.\n\n"
        f"Campaign: {campaign_name}\n"
        f"Target Segment: {segment}\n"
        f"Tone: {tone} ({tone_guide})\n"
        f"Product Focus: {product_hint or 'General jewellery collection'}\n\n"
        "Rules:\n"
        "- Keep under 60 words\n"
        "- Start with the customer's name placeholder: {{name}}\n"
        "- End with a clear CTA (book appointment / reply / visit store)\n"
        "- Use ₹ for prices, never make up specific prices\n"
        "- Brand name: Facets Lifestyle\n\n"
        "Write ONLY the message text, no explanation."
    )
    return chat([
        {"role": "system", "content": JEWELLERY_SYSTEM},
        {"role": "user", "content": prompt},
    ], temperature=0.7, max_tokens=250).strip()


def quotation_suggest(lead: dict, products: list[dict]) -> dict:
    """Suggest the best products for a lead and return JSON with recommendations."""
    products_text = "\n".join(
        f"- [{p.get('id')}] {p.get('product_name')} ({p.get('metal_type')}, "
        f"{p.get('category')}) — ₹{int(p.get('price', 0)):,} | {p.get('description', '')[:80]}"
        for p in products[:30]
    )
    prompt = (
        "You are a jewellery sales expert at Facets Lifestyle. "
        "Suggest the 3-5 most suitable products for this lead from the catalogue below.\n\n"
        f"Lead Profile:\n"
        f"- Name: {lead.get('name')}\n"
        f"- Interest: {lead.get('customer_type') or 'General'}\n"
        f"- Budget: ₹{int(lead.get('budget') or 0):,}\n"
        f"- City: {lead.get('city') or 'Unknown'}\n"
        f"- Status: {lead.get('status')}\n\n"
        f"Available Products:\n{products_text}\n\n"
        "Respond ONLY with JSON: "
        '{"recommendations": [{"product_id": <int>, "product_name": "<str>", '
        '"price": <float>, "reason": "<1 sentence why this suits the lead>"}], '
        '"summary": "<1 sentence overall recommendation>"}'
    )
    return chat_json([
        {"role": "system", "content": JEWELLERY_SYSTEM},
        {"role": "user", "content": prompt},
    ], temperature=0.3, max_tokens=600)
