"""Unified LLM service provider (OpenAI ChatGPT, Groq, DeepSeek, Gemini) used by AI features."""
import os
import json
import logging
from typing import List, Dict, Optional
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("facets.llm")


class LlmNotConfigured(RuntimeError):
    pass


# Backward compatibility alias
DeepSeekNotConfigured = LlmNotConfigured

PROVIDER = os.environ.get("LLM_PROVIDER", "openai").lower().strip()


def _get_client():
    provider = os.environ.get("LLM_PROVIDER", "groq" if os.environ.get("GROQ_API_KEY") else "openai").lower().strip()
    if provider == "groq" or (not os.environ.get("OPENAI_API_KEY") and os.environ.get("GROQ_API_KEY")) or (os.environ.get("GROQ_API_KEY") and provider not in ("deepseek", "gemini")):
        api_key = os.environ.get("GROQ_API_KEY", "").strip()
        if not api_key:
            raise LlmNotConfigured("GROQ_API_KEY is not set. Add it to .env.")
        base_url = os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1").strip()
        model = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b").strip()
        return OpenAI(api_key=api_key, base_url=base_url), model
    elif provider == "deepseek":
        api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
        if not api_key:
            raise LlmNotConfigured(
                "DEEPSEEK_API_KEY is not set. Add it to .env."
            )
        base_url = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com").strip()
        model = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat").strip()
        return OpenAI(api_key=api_key, base_url=base_url), model
    elif provider == "gemini" or (not os.environ.get("OPENAI_API_KEY") and os.environ.get("GEMINI_API_KEY")):
        api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        if not api_key:
            raise LlmNotConfigured("GEMINI_API_KEY is not set. Add it to .env.")
        base_url = "https://generativelanguage.googleapis.com/v1beta/openai/"
        model = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash").strip()
        return OpenAI(api_key=api_key, base_url=base_url), model
    else:
        # Default to OpenAI
        api_key = os.environ.get("OPENAI_API_KEY", "").strip()
        if not api_key:
            raise LlmNotConfigured(
                "OPENAI_API_KEY is not set. Add it to .env."
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


# ---- Domain helpers (Web & Digital Agency CRM) ----

AGENCY_SYSTEM = (
    "You are an empathetic, highly skilled business consultant and representative for Gauransh Jaroli & ParshWebCraft digital agency.\n"
    "You are chatting directly with contacts and leads on WhatsApp.\n\n"
    "CRITICAL CONVERSATIONAL RULES (FOLLOW STRICTLY):\n"
    "1. FESTIVAL & HOLIDAY GREETINGS (STRICT RULE - ZERO SALES PITCH):\n"
    "   - When the user sends a festival greeting (e.g., 'Happy Diwali', 'Wishing you and family a very Happy Diwali', 'Same to you', 'Shubh Deepawali', 'Happy New Year'):\n"
    "     Reply with genuine warmth, blessing, and joy reciprocating the festive wish to them and their family.\n"
    "     Example: 'Thank you so much! Wishing you and your family a very Happy & Prosperous Diwali! 🪔✨ May this festival bring good health, happiness, and abundant success to your home!'\n"
    "     STRICT PROHIBITION: NEVER pitch services, packages, websites, or agency offerings on festival greetings. DO NOT ask business questions. Just celebrate the moment with pure warmth and respect.\n\n"
    "2. PERSONAL & PHONEBOOK AWARENESS:\n"
    "   - Many contacts are friends, college mates, family members, or acquaintances from Gauransh's phonebook.\n"
    "   - If they ask personal pleasantries (e.g. 'Kaise ho Gauransh?', 'Bhaiya aap ho?', 'Kaun bol raha hai?', 'Sab badhiya?'):\n"
    "     Reply naturally in a friendly, conversational tone (e.g. 'Main ekdum badhiya hoon! Aap bataiye aap kaise hain? Aur Happy Diwali aapko aur family ko!').\n"
    "     Never speak like a cold corporate robot.\n\n"
    "3. LISTEN FIRST FOR WORK INQUIRIES, NEVER HARD-SELL:\n"
    "   - Only discuss services and projects if the customer explicitly asks about work, websites, software, marketing, or business requirements.\n"
    "   - If the user says 'I have a requirement' or 'listen to me': invite them warmly to share (e.g. 'Sure, go ahead! Tell me what you have in mind.').\n"
    "   - When the user shares an idea: acknowledge it thoughtfully and ask ONE relevant clarifying question.\n\n"
    "4. DO NOT PUSH CALLS OR MEETINGS PREMATURELY:\n"
    "   - NEVER push a phone call or meeting unless the customer specifically asks for a call or explicitly asks how to proceed.\n"
    "   - If the customer says 'call baad me', 'call last me', or wants to discuss here: respect it 100% and stay focused on understanding their requirements.\n\n"
    "5. STRICT PRICING & QUOTATION GUARDRAIL (NEVER INVENT OR FABRICATE RATES):\n"
    "   - NEVER make up or quote random prices, packages, or rupee amounts out of thin air (like ₹15,000 or ₹25,000).\n"
    "   - When the customer asks for rates, packages, or pricing:\n"
    "     Explain politely that packages are customized based on their specific business needs (e.g., post frequency, creative design style, ad budget) so they get the best ROI.\n"
    "     Tell them that our team will connect with them directly with a tailored proposal and exact pricing.\n\n"
    "6. NATURAL HUMAN CHAT STYLE:\n"
    "   - Match the customer's language naturally (casual Hinglish or Indian English).\n"
    "   - Speak like a friendly tech consultant (e.g., 'Shopify', 'custom website', 'designs', 'products', 'features').\n"
    "   - NEVER use robotic translated Hindi words like 'SKU sankhya', 'property sheet', 'kripya', 'pasandida platform'.\n"
    "   - Keep messages short (1 to 2 sentences, maximum 3). Never write long paragraphs.\n"
    "   - Only ask ONE question at a time so the customer can reply easily."
)


def whatsapp_reply(lead: dict, history: list[dict], custom_knowledge: str = None) -> str:
    """Generate a contextual WhatsApp reply for a lead.

    history: [{direction:"in|out", message:"..."}] oldest first.
    """
    convo_lines = []
    last_inbound = ""
    for m in history[-12:]:
        who = "Customer" if m.get("direction") == "in" else "Agent"
        convo_lines.append(f"{who}: {m.get('message')}")
        if m.get("direction") == "in":
            last_inbound = (m.get("message") or "").strip()

    name = lead.get("name") or "there"

    # Try calling LLM first
    try:
        system_prompt = AGENCY_SYSTEM
        if custom_knowledge and custom_knowledge.strip():
            system_prompt = f"{AGENCY_SYSTEM}\n\nAgency Knowledge Base:\n{custom_knowledge.strip()}"

        user_prompt = (
            f"Customer name: {name}\n\n"
            f"Conversation history:\n" + "\n".join(convo_lines) +
            "\n\nRespond directly to the customer's last message. Keep it conversational, brief (1-2 sentences), and follow the guidelines above. Write ONLY your message with no quotation marks or prefixes:"
        )
        return chat([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ], temperature=0.6, max_tokens=500).strip()
    except Exception as e:
        logger.warning("LLM API call failed in whatsapp_reply (%s). Using smart fallback reply.", e)
        text_lower = last_inbound.lower()
        if any(w in text_lower for w in ["diwali", "deepawali", "deepavali", "happy diwali", "shubh deepawali", "same to you", "wishing you"]):
            return f"Thank you so much, {name}! Wishing you and your family a very Happy & Prosperous Diwali! 🪔✨ May this year bring endless happiness, good health, and success to your home!"
        elif any(w in text_lower for w in ["kaise ho", "kaisa hai", "kese ho", "sab theek", "sab badhiya", "bhaiya", "gauransh"]):
            return f"Main ekdum badhiya hoon! Aap bataiye aap kaise hain? Aur Happy Diwali aapko aur family ko! 🌟"
        elif any(w in text_lower for w in ["okk", "ok", "okay", "thik", "theek", "thanks", "thank you", "dhanyawad", "sure", "done", "got it"]):
            return f"Thank you, {name}! Wishing you a wonderful celebration. Feel free to connect anytime!"
        elif any(w in text_lower for w in ["hi", "hello", "hey", "namaste", "start"]):
            return f"Hi {name}, thanks for reaching out! Happy Diwali to you and family. How can I help you today?"
        elif any(w in text_lower for w in ["price", "cost", "budget", "package", "rate"]):
            return f"Hi {name}, our packages are customized based on your requirements. Would tomorrow at 3 PM work for a quick 10-minute discovery call?"
        elif any(w in text_lower for w in ["call", "meet", "meeting", "talk", "discuss"]):
            return f"Sure {name}! We'd love to connect. Please share your convenient date and time, or drop your phone number."
        else:
            return f"Hi {name}, thank you for your message! Our team has received it and will follow up with you shortly. Have a great day!"


def call_insights(call: dict, lead: dict) -> dict:
    """Return {summary, sentiment, next_action} for a call log."""
    prompt = (
        "Analyse this web agency sales call and respond ONLY with JSON having keys "
        "summary (1-2 sentences), sentiment (Positive|Neutral|Negative), "
        "next_action (one specific concrete step).\n\n"
        f"Lead: {lead.get('name')} ({lead.get('customer_type')}) — "
        f"status {lead.get('status')}, budget ₹{int(lead.get('budget') or 0):,}.\n"
        f"Call status: {call.get('call_status')}. Duration: {call.get('call_duration')}s.\n"
        f"Raw summary: {call.get('call_summary') or '(none)'}\n"
        f"Transcript: {call.get('transcript') or '(no transcript available)'}"
    )
    return chat_json([
        {"role": "system", "content": AGENCY_SYSTEM},
        {"role": "user", "content": prompt},
    ], temperature=0.2, max_tokens=350)


def call_script(lead: dict, history: list[dict]) -> str:
    """Suggest a 90-second call script tailored to the lead."""
    activity_lines = [f"- [{a['activity_type']}] {a['description']}" for a in history[:8]]
    prompt = (
        f"Draft a 90-second outbound call script for a ParshWebCraft business representative calling:\n"
        f"- Name: {lead.get('name')}\n- City: {lead.get('city')}\n"
        f"- Interest: {lead.get('customer_type')}\n- Budget: ₹{int(lead.get('budget') or 0):,}\n"
        f"- Status: {lead.get('status')}\n\nRecent activities:\n"
        + ("\n".join(activity_lines) or "(no prior activity)")
        + "\n\nFormat with sections: Opening, Discovery (3 questions), Value Pitch, Next Step. "
          "Keep total under 220 words."
    )
    return chat([
        {"role": "system", "content": AGENCY_SYSTEM},
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
        {"role": "system", "content": AGENCY_SYSTEM},
        {"role": "user", "content": prompt},
    ], temperature=0.6, max_tokens=120).strip()


def dashboard_briefing(stats: dict) -> str:
    """Generate a concise AI morning briefing for the sales manager dashboard."""
    prompt = (
        "You are an AI sales coach for ParshWebCraft web agency. "
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
        {"role": "system", "content": AGENCY_SYSTEM},
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
        f"Draft a WhatsApp outreach message for a web development/SEO agency sales campaign.\n\n"
        f"Campaign: {campaign_name}\n"
        f"Target Segment: {segment}\n"
        f"Tone: {tone} ({tone_guide})\n"
        f"Product Focus: {product_hint or 'General web/app services'}\n\n"
        "Rules:\n"
        "- Keep under 60 words\n"
        "- Start with the customer's name placeholder: {{name}}\n"
        "- End with a clear CTA (schedule a call / reply / get free audit)\n"
        "- Use ₹ or $ for prices, never make up specific prices\n"
        "- Brand name: ParshWebCraft\n\n"
        "Write ONLY the message text, no explanation."
    )
    return chat([
        {"role": "system", "content": AGENCY_SYSTEM},
        {"role": "user", "content": prompt},
    ], temperature=0.7, max_tokens=250).strip()


def quotation_suggest(lead: dict, products: list[dict]) -> dict:
    """Suggest the best services/packages for a lead and return JSON with recommendations."""
    products_text = "\n".join(
        f"- [{p.get('id')}] {p.get('product_name')} ({p.get('metal_type')}, "
        f"{p.get('category')}) — ₹{int(p.get('price', 0)):,} | {p.get('description', '')[:80]}"
        for p in products[:30]
    )
    prompt = (
        "You are a sales expert at ParshWebCraft digital agency. "
        "Suggest the 3-5 most suitable services/packages for this lead from the catalogue below.\n\n"
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
        {"role": "system", "content": AGENCY_SYSTEM},
        {"role": "user", "content": prompt},
    ], temperature=0.3, max_tokens=600)


def whatsapp_reply_suggestions(lead: dict, history: list[dict]) -> list[str]:
    """Generate 3 distinct contextual WhatsApp reply suggestions for a lead."""
    convo_lines = []
    for m in history[-12:]:
        who = "Customer" if m.get("direction") == "in" else "Agent"
        convo_lines.append(f"{who}: {m.get('message', '')}")

    name = lead.get("name") or "there"
    fallback = [
        f"Hi {name}, thanks for reaching out! Let me check the details and get right back to you.",
        f"Sure! We can definitely help you with this. Would tomorrow at 3 PM be a good time for a quick 10-minute call?",
        f"I've noted your requirements. Let me share our portfolio and package options with you shortly!"
    ]

    user_prompt = (
        f"Lead profile:\n"
        f"- Name: {name}\n"
        f"- City: {lead.get('city') or 'Unknown'}\n"
        f"- Interest: {lead.get('customer_type') or 'General'}\n"
        f"- Budget: ₹{int(lead.get('budget') or 0):,}\n"
        f"- Status: {lead.get('status') or 'New'}\n\n"
        f"Conversation history:\n" + ("\n".join(convo_lines) if convo_lines else "No prior messages.") +
        "\n\nGenerate EXACTLY 3 distinct, high-converting, professional WhatsApp reply options that the agent can send immediately.\n"
        "Option 1: Friendly acknowledgment & helpful direct response\n"
        "Option 2: Value proposition with an engaging question\n"
        "Option 3: Clear next step (e.g. scheduling a call or sharing demo link)\n"
        "Keep each option under 35 words. Return ONLY a JSON object: {\"suggestions\": [\"option 1\", \"option 2\", \"option 3\"]}"
    )
    try:
        data = chat_json([
            {"role": "system", "content": AGENCY_SYSTEM},
            {"role": "user", "content": user_prompt},
        ], temperature=0.5, max_tokens=300)
        if isinstance(data, dict) and "suggestions" in data and isinstance(data["suggestions"], list):
            valid = [str(s).strip() for s in data["suggestions"] if str(s).strip()]
            if len(valid) >= 2:
                return valid[:3]
    except Exception as e:
        logger.warning("whatsapp_reply_suggestions error: %s", e)

    return fallback


def translate_text(text: str, target_lang: str = "English") -> str:
    """Translate text into target language."""
    if not text or not text.strip():
        return ""
    prompt = f"Translate the following customer message into {target_lang}. Keep tone natural, friendly and accurate. Return ONLY the translation without quotes:\n\n{text}"
    return chat([
        {"role": "system", "content": "You are a professional multilingual translator for business customer support."},
        {"role": "user", "content": prompt}
    ], temperature=0.3, max_tokens=250).strip()

