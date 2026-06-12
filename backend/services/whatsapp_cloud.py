"""Meta WhatsApp Cloud API client and webhook helpers."""
import os
import re
from typing import Optional, Dict, Any
import httpx

GRAPH_BASE = "https://graph.facebook.com/v21.0"


class WhatsappNotConfigured(RuntimeError):
    pass


def _token() -> str:
    t = os.environ.get("WHATSAPP_TOKEN", "").strip()
    if not t:
        raise WhatsappNotConfigured("WHATSAPP_TOKEN not set in .env")
    return t


def _phone_id() -> str:
    p = os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "").strip()
    if not p:
        raise WhatsappNotConfigured("WHATSAPP_PHONE_NUMBER_ID not set in .env")
    return p


def verify_token() -> str:
    return os.environ.get("WHATSAPP_VERIFY_TOKEN", "facets-verify")


def is_configured() -> bool:
    return bool(os.environ.get("WHATSAPP_TOKEN") and os.environ.get("WHATSAPP_PHONE_NUMBER_ID"))


def _normalize(num: str) -> str:
    """Meta requires phone like 919876543210 (no '+' or dashes)."""
    if not num:
        return num
    return re.sub(r"[^0-9]", "", num)


def send_text(to: str, body: str) -> Dict[str, Any]:
    if not body.strip():
        raise ValueError("Empty WhatsApp body")
    payload = {
        "messaging_product": "whatsapp",
        "to": _normalize(to),
        "type": "text",
        "text": {"body": body[:4096]},
    }
    with httpx.Client(timeout=20.0) as client:
        r = client.post(
            f"{GRAPH_BASE}/{_phone_id()}/messages",
            headers={"Authorization": f"Bearer {_token()}", "Content-Type": "application/json"},
            json=payload,
        )
        if r.status_code >= 400:
            raise RuntimeError(f"WhatsApp send error {r.status_code}: {r.text[:300]}")
        return r.json()


def parse_inbound(payload: dict) -> list[dict]:
    """Parse a Meta webhook payload into a list of normalized inbound messages.

    Returns: [{from_number, name, message, wa_message_id, ts}].
    """
    out = []
    for entry in payload.get("entry", []) or []:
        for change in entry.get("changes", []) or []:
            value = change.get("value") or {}
            contacts = {c.get("wa_id"): (c.get("profile") or {}).get("name")
                        for c in (value.get("contacts") or [])}
            for msg in value.get("messages") or []:
                if msg.get("type") != "text":
                    continue
                wa_id = msg.get("from")
                out.append({
                    "from_number": wa_id,
                    "name": contacts.get(wa_id),
                    "message": ((msg.get("text") or {}).get("body") or "").strip(),
                    "wa_message_id": msg.get("id"),
                    "ts": msg.get("timestamp"),
                })
    return out
