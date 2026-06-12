"""Vapi.ai outbound voice agent integration."""
import os
from typing import Optional, Dict, Any
import httpx

API_BASE = "https://api.vapi.ai"


class VapiNotConfigured(RuntimeError):
    pass


def _key() -> str:
    k = os.environ.get("VAPI_API_KEY", "").strip()
    if not k:
        raise VapiNotConfigured("VAPI_API_KEY not set. Add it to /app/backend/.env.")
    return k


def _phone_number_id() -> str:
    p = os.environ.get("VAPI_PHONE_NUMBER_ID", "").strip()
    if not p:
        raise VapiNotConfigured("VAPI_PHONE_NUMBER_ID not set.")
    return p


def _assistant_id() -> Optional[str]:
    return os.environ.get("VAPI_ASSISTANT_ID", "").strip() or None


def is_configured() -> bool:
    return bool(
        os.environ.get("VAPI_API_KEY") and os.environ.get("VAPI_PHONE_NUMBER_ID")
    )


def place_call(*, to_number: str, lead: dict, script: Optional[str] = None) -> Dict[str, Any]:
    """Trigger an outbound AI voice call via Vapi.

    If VAPI_ASSISTANT_ID is set, uses that saved assistant. Otherwise sends a
    transient assistant config with a jewellery-aware first message + system prompt.
    """
    if not to_number:
        raise ValueError("to_number is required")
    body: Dict[str, Any] = {
        "phoneNumberId": _phone_number_id(),
        "customer": {"number": to_number, "name": lead.get("name") or "Customer"},
    }
    aid = _assistant_id()
    if aid:
        body["assistantId"] = aid
    else:
        first_message = (
            f"Hello {lead.get('name') or ''}, this is Aanya from Facets Lifestyle Jewellery. "
            f"Is this a good time for a quick 2-minute conversation?"
        )
        sys_prompt = (
            "You are a warm Indian jewellery sales consultant at Facets Lifestyle. "
            "Goal: qualify interest (gold/diamond/bridal), confirm city and budget, "
            "and book a showroom visit or video consultation. Keep replies short, polite. "
            f"Lead context: {lead.get('customer_type') or 'general'} interest, "
            f"city {lead.get('city') or 'unknown'}, "
            f"budget ~₹{int(lead.get('budget') or 0):,}."
        )
        if script:
            sys_prompt += "\n\nReference script:\n" + script[:1500]
        body["assistant"] = {
            "firstMessage": first_message,
            "model": {
                "provider": "openai",
                "model": "gpt-4o-mini",
                "messages": [{"role": "system", "content": sys_prompt}],
            },
            "voice": {"provider": "11labs", "voiceId": "sarah"},
            "transcriber": {"provider": "deepgram", "model": "nova-2"},
        }
    with httpx.Client(timeout=30.0) as client:
        r = client.post(
            f"{API_BASE}/call",
            headers={"Authorization": f"Bearer {_key()}", "Content-Type": "application/json"},
            json=body,
        )
        if r.status_code >= 400:
            raise RuntimeError(f"Vapi error {r.status_code}: {r.text[:500]}")
        return r.json()


def get_call(call_id: str) -> Dict[str, Any]:
    with httpx.Client(timeout=20.0) as client:
        r = client.get(
            f"{API_BASE}/call/{call_id}",
            headers={"Authorization": f"Bearer {_key()}"},
        )
        if r.status_code >= 400:
            raise RuntimeError(f"Vapi get error {r.status_code}: {r.text[:300]}")
        return r.json()
