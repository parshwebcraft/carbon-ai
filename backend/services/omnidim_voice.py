"""OmniDimension (omnidim.io) outbound voice agent integration."""
import os
import json
import logging
from typing import Optional, Dict, Any
from dotenv import load_dotenv
import httpx
from sqlalchemy.orm import Session

load_dotenv()

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

    full_name = (lead.get("name") or "").strip()
    first_name = full_name.split()[0] if full_name else "Sir"
    city = (lead.get("city") or "").strip() or "Udaipur"
    company = (lead.get("company") or "").strip() or "business"
    customer_type = (lead.get("customer_type") or "").strip() or "General Business"

    payload = {
        "agent_id": agent_id,
        "to_number": cleaned_number,
        "call_context": {
            "customer_name": full_name or first_name,
            "user_name": full_name or first_name,
            "first_name": first_name,
            "name": full_name or first_name,
            "city": city,
            "company": company,
            "business_type": customer_type,
            "customer_type": customer_type,
            "budget": f"INR {lead.get('budget', 0)}",
            "status": lead.get("status") or "New",
            "notes": (script or lead.get("notes") or "")[:500]
        },
        "metadata": {
            "crm_lead_id": str(lead.get("id") or ""),
            "customer_name": full_name or first_name,
            "source": "ParshCall_CRM"
        }
    }

    logger.info("Dispatching OmniDimension call to %s for customer '%s' (Agent: %s)", cleaned_number, full_name, agent_id)

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


def download_recording(recording_url: str, call_id: int) -> Optional[str]:
    """Download audio recording from OmniDimension and save to backend/recordings/."""
    if not recording_url:
        return None
    try:
        os.makedirs("recordings", exist_ok=True)
        filename = f"omnidim_{call_id}.mp3"
        filepath = os.path.join("recordings", filename)
        
        # If full URL not provided, prepend base
        full_url = recording_url if recording_url.startswith("http") else f"https://omnidim.io{recording_url}"
        
        with httpx.Client(timeout=20.0, follow_redirects=True) as client:
            r = client.get(full_url)
            if r.status_code == 200 and len(r.content) > 100:
                with open(filepath, "wb") as f:
                    f.write(r.content)
                logger.info("Downloaded call recording to %s (%d bytes)", filepath, len(r.content))
                return f"/api/calls/recording/{filename}"
    except Exception as e:
        logger.error("Failed to download recording for call %s: %s", call_id, e)
    return None


def sync_logs_and_recordings(db: Session) -> dict:
    """Fetch recent call logs from OmniDimension, sync transcripts/summaries, and download audio recordings."""
    from models import Call, Lead, AIAgentLog
    from datetime import datetime, timezone
    
    if not is_configured(db):
        return {"ok": False, "message": "OmniDimension not configured"}
        
    api_key = _api_key(db)
    synced_count = 0
    downloaded_count = 0

    try:
        with httpx.Client(timeout=15.0) as client:
            res = client.get(
                f"{API_BASE}/calls/logs?pagesize=50",
                headers={"Authorization": f"Bearer {api_key}"}
            )
            if res.status_code != 200:
                return {"ok": False, "message": f"OmniDimension error: {res.text}"}
                
            data = res.json()
            call_logs = data.get("call_log_data") or []
            
            for item in call_logs:
                call_id_remote = item.get("id")
                req_id = str(item.get("call_request_id", {}).get("id") if isinstance(item.get("call_request_id"), dict) else item.get("call_request_id") or "")
                to_num = item.get("to_number") or ""
                duration = int(item.get("call_duration_in_seconds") or 0)
                raw_status = item.get("call_status") or "completed"
                status = "Completed" if raw_status.lower() == "completed" else raw_status.capitalize()
                summary = item.get("sentiment_analysis_details") or ""
                transcript = item.get("call_conversation") or ""
                sentiment = item.get("sentiment_score") or "Neutral"
                
                # Extract recording URL
                rec_url = item.get("internal_recording_url") or item.get("recording_url") or ""
                
                # Match existing Call record by vapi_call_id (which stores request_id / call_id) or lead phone
                call = None
                if req_id:
                    call = db.query(Call).filter(Call.vapi_call_id == req_id).first()
                if not call and call_id_remote:
                    call = db.query(Call).filter(Call.vapi_call_id == str(call_id_remote)).first()
                if not call and to_num:
                    lead = db.query(Lead).filter(Lead.phone.endswith(to_num[-10:])).first()
                    if lead:
                        call = db.query(Call).filter(Call.lead_id == lead.id).order_by(Call.id.desc()).first()
                
                # If still no call record, create one
                if not call and to_num:
                    lead = db.query(Lead).filter(Lead.phone.endswith(to_num[-10:])).first()
                    if lead:
                        call = Call(
                            lead_id=lead.id,
                            vapi_call_id=req_id or str(call_id_remote),
                            call_status=status,
                            call_duration=duration,
                            created_at=datetime.now(timezone.utc)
                        )
                        db.add(call)
                        db.commit()
                        db.refresh(call)
                
                if call:
                    call.call_status = status
                    call.call_duration = duration
                    if summary:
                        call.call_summary = summary
                    if transcript:
                        # Clean HTML tags from transcript
                        cleaned_transcript = transcript.replace("<br/>", "\n").replace("<br>", "\n")
                        call.transcript = cleaned_transcript
                    if sentiment:
                        call.sentiment = sentiment.capitalize()
                    
                    # Download audio recording to recordings/ folder if available
                    if rec_url and call_id_remote:
                        local_url = download_recording(rec_url, call_id_remote)
                        if local_url:
                            call.recording_url = local_url
                            downloaded_count += 1
                        else:
                            call.recording_url = rec_url
                    
                    synced_count += 1
            
            db.commit()
            return {
                "ok": True, 
                "message": f"Successfully synced {synced_count} call(s) and downloaded {downloaded_count} recording(s).",
                "synced_count": synced_count,
                "downloaded_count": downloaded_count
            }
    except Exception as e:
        logger.error("OmniDimension sync error: %s", e)
        return {"ok": False, "message": str(e)}
