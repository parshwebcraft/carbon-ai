"""DeepSeek (OpenAI-compatible) text client used by AI features."""
import os
import json
from typing import List, Dict, Optional
import httpx

BASE_URL = "https://api.deepseek.com"
MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")


class DeepSeekNotConfigured(RuntimeError):
    pass


def _key() -> str:
    k = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not k:
        raise DeepSeekNotConfigured(
            "DEEPSEEK_API_KEY is not set. Add it to /app/backend/.env."
        )
    return k


def chat(messages: List[Dict[str, str]], *, temperature: float = 0.4,
         max_tokens: int = 600, response_format: Optional[str] = None) -> str:
    """Return the assistant text from a DeepSeek chat completion."""
    body = {
        "model": MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
    }
    if response_format == "json":
        body["response_format"] = {"type": "json_object"}
    with httpx.Client(timeout=60.0) as client:
        r = client.post(
            f"{BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {_key()}", "Content-Type": "application/json"},
            json=body,
        )
        if r.status_code >= 400:
            raise RuntimeError(f"DeepSeek error {r.status_code}: {r.text[:400]}")
        data = r.json()
    return data["choices"][0]["message"]["content"]


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
