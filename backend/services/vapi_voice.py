"""Vapi.ai outbound voice agent integration."""
import os
import json
from typing import Optional, Dict, Any
import httpx
from sqlalchemy.orm import Session

API_BASE = "https://api.vapi.ai"


class VapiNotConfigured(RuntimeError):
    pass


def _get_setting(key: str, db: Optional[Session] = None) -> Optional[str]:
    if db:
        try:
            from models import Setting
            row = db.query(Setting).filter(Setting.key == "calling").first()
            if row:
                settings = json.loads(row.value)
                val = settings.get(key)
                if val:
                    return str(val).strip()
        except Exception:
            pass
    
    # Fallback to env var
    env_name = key.upper()
    return os.environ.get(env_name, "").strip() or None


def _key(db: Optional[Session] = None) -> str:
    k = _get_setting("vapi_api_key", db)
    if not k:
        raise VapiNotConfigured("Vapi API key not set. Please configure Vapi.ai keys in Calling Settings.")
    return k


def _phone_number_id(db: Optional[Session] = None) -> str:
    p = _get_setting("vapi_phone_number_id", db)
    if not p:
        raise VapiNotConfigured("Vapi Phone Number ID not set. Please configure Vapi.ai keys in Calling Settings.")
    return p


def _assistant_id(db: Optional[Session] = None) -> Optional[str]:
    return _get_setting("vapi_assistant_id", db) or None


def is_configured(db: Optional[Session] = None) -> bool:
    try:
        return bool(_get_setting("vapi_api_key", db) and _get_setting("vapi_phone_number_id", db))
    except Exception:
        return False


def place_call(*, to_number: str, lead: dict, script: Optional[str] = None, db: Optional[Session] = None) -> Dict[str, Any]:
    """Trigger an outbound AI voice call via Vapi.

    If VAPI_ASSISTANT_ID is set, uses that saved assistant. Otherwise sends a
    transient assistant config with a jewellery-aware first message + system prompt.
    """
    if not to_number:
        raise ValueError("to_number is required")
    body: Dict[str, Any] = {
        "phoneNumberId": _phone_number_id(db),
        "customer": {"number": to_number, "name": lead.get("name") or "Customer"},
    }
    aid = _assistant_id(db)
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
            headers={"Authorization": f"Bearer {_key(db)}", "Content-Type": "application/json"},
            json=body,
        )
        if r.status_code >= 400:
            raise RuntimeError(f"Vapi error {r.status_code}: {r.text[:500]}")
        return r.json()


def get_call(call_id: str, db: Optional[Session] = None) -> Dict[str, Any]:
    with httpx.Client(timeout=20.0) as client:
        r = client.get(
            f"{API_BASE}/call/{call_id}",
            headers={"Authorization": f"Bearer {_key(db)}"},
        )
        if r.status_code >= 400:
            raise RuntimeError(f"Vapi get error {r.status_code}: {r.text[:300]}")
        return r.json()
