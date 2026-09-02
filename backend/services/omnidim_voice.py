"""OmniDimension (omnidim.io) outbound voice agent integration."""
import os
import json
import logging
from typing import Optional, Dict, Any
import httpx
from sqlalchemy.orm import Session

logger = logging.getLogger("facets.omnidim")
API_BASE = "https://omnidim.io/api/v1"


class OmniDimNotConfigured(RuntimeError):
    pass


def _get_setting(key: str, db: Optional[Session] = None) -> Optional[str]:
    if db:
        try:
            from models import Setting, Integration
            # 1. Check Integration table
            integ = db.query(Integration).filter(Integration.app_name == "omnidim").first()
            if integ and integ.enabled:
                if key == "omnidim_api_key" and integ.api_key:
                    return integ.api_key.strip()
                if key == "omnidim_agent_id" and integ.secret_key:
                    return integ.secret_key.strip()

            # 2. Check Setting table
            row = db.query(Setting).filter(Setting.key == "calling").first()
            if row:
                settings = json.loads(row.value)
                val = settings.get(key)
                if val:
                    return str(val).strip()
        except Exception:
            pass

    # 3. Fallback to environment variables
    env_name = key.upper()
    return os.environ.get(env_name, "").strip() or None


def _api_key(db: Optional[Session] = None) -> str:
    k = _get_setting("omnidim_api_key", db)
    if not k:
        raise OmniDimNotConfigured("OmniDimension API key not configured.")
    return k


def _agent_id(db: Optional[Session] = None) -> int:
    aid = _get_setting("omnidim_agent_id", db)
    if not aid:
        raise OmniDimNotConfigured("OmniDimension Agent ID not configured.")
    try:
        # Strip any leading '#' if user typed #248152
        cleaned = aid.replace("#", "").strip()
        return int(cleaned)
    except ValueError:
        raise OmniDimNotConfigured(f"Invalid OmniDimension Agent ID: {aid}")


def is_configured(db: Optional[Session] = None) -> bool:
    try:
        return bool(_get_setting("omnidim_api_key", db) and _get_setting("omnidim_agent_id", db))
    except Exception:
        return False


def test_connection(db: Optional[Session] = None) -> dict:
    """Validate OmniDimension API key by fetching agents list."""
    key = _api_key(db)
    with httpx.Client(timeout=12.0) as client:
        res = client.get(
            f"{API_BASE}/agents",
            headers={"Authorization": f"Bearer {key}"}
        )
        if res.status_code == 200:
            data = res.json()
            bots = data.get("bots") or []
            return {
                "ok": True,
                "message": f"Connected to OmniDimension! Found {len(bots)} agent(s).",
                "agents": [{"id": b.get("id"), "name": b.get("name")} for b in bots]
            }
        else:
            return {
                "ok": False,
                "message": f"OmniDimension error {res.status_code}: {res.text}"
            }


def place_call(*, to_number: str, lead: dict, script: Optional[str] = None, db: Optional[Session] = None) -> Dict[str, Any]:
    """Dispatch an outbound AI voice call to a phone number via OmniDimension."""
    if not to_number:
        raise ValueError("to_number is required")

    api_key = _api_key(db)
    agent_id = _agent_id(db)

    # Ensure to_number has leading + (E.164 format)
    cleaned_number = to_number.strip().replace(" ", "").replace("-", "")
    if not cleaned_number.startswith("+"):
        if len(cleaned_number) == 10:
            cleaned_number = "+91" + cleaned_number
        else:
            cleaned_number = "+" + cleaned_number

    payload = {
        "agent_id": agent_id,
        "to_number": cleaned_number,
        "call_context": {
            "customer_name": lead.get("name") or "Valued Client",
            "city": lead.get("city") or "India",
            "budget": f"INR {lead.get('budget', 0)}",
            "customer_type": lead.get("customer_type") or "Website & AI Services",
            "status": lead.get("status") or "New",
            "notes": (script or lead.get("notes") or "")[:500]
        },
        "metadata": {
            "crm_lead_id": str(lead.get("id") or ""),
            "source": "ParshCall_CRM"
        }
    }

    logger.info("Dispatching OmniDimension call to %s (Agent: %s)", cleaned_number, agent_id)

    with httpx.Client(timeout=15.0) as client:
        res = client.post(
            f"{API_BASE}/calls/dispatch",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json=payload
        )

        if res.status_code >= 400:
            logger.error("OmniDimension dispatch error %s: %s", res.status_code, res.text)
            raise RuntimeError(f"OmniDimension call dispatch failed ({res.status_code}): {res.text}")

        data = res.json()
        request_id = str(data.get("requestId") or data.get("id") or "")
        return {
            "id": request_id,
            "status": data.get("status", "dispatched"),
            "raw": data
        }
