"""Iteration 2 tests: DeepSeek AI, Vapi Voice, WhatsApp Cloud webhook.

All third-party keys are intentionally empty in this iteration.
Expected behaviour:
- 503s when DEEPSEEK_API_KEY / VAPI keys missing
- Local WhatsApp DB fallback continues to work
- Webhooks accept Meta/Vapi-shaped payloads without crashing
- Iteration 1 endpoints remain intact
"""
import os
import sqlite3
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://facets-crm-mvp.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@facetscrm.com"
ADMIN_PASS = "password123"
SQLITE_PATH = "/app/backend/facets.db"


@pytest.fixture(scope="session")
def admin_headers():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=30)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# ---------- regression: existing iteration-1 endpoints ----------
def test_regression_health():
    r = requests.get(f"{API}/health", timeout=10)
    assert r.status_code == 200


def test_regression_leads_shape(admin_headers):
    r = requests.get(f"{API}/leads", params={"page": 1, "page_size": 3}, headers=admin_headers, timeout=15)
    assert r.status_code == 200
    j = r.json()
    for k in ("items", "total", "page", "page_size"):
        assert k in j


def test_regression_whatsapp_conversations(admin_headers):
    r = requests.get(f"{API}/whatsapp/conversations", headers=admin_headers, timeout=10)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_regression_whatsapp_thread_route_still_works(admin_headers):
    """Critical: /api/whatsapp/webhook must NOT shadow /api/whatsapp/{lead_id}."""
    r = requests.get(f"{API}/whatsapp/1", headers=admin_headers, timeout=10)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_regression_dashboard(admin_headers):
    r = requests.get(f"{API}/dashboard/stats", headers=admin_headers, timeout=15)
    assert r.status_code == 200


# ---------- Call schema regression: new optional fields ----------
def test_calls_schema_has_new_fields(admin_headers):
    r = requests.get(f"{API}/calls", params={"lead_id": 1}, headers=admin_headers, timeout=10)
    assert r.status_code == 200
    items = r.json()
    if not items:
        pytest.skip("no calls seeded for lead 1")
    sample = items[0]
    # New optional fields may be null but keys should be in serialized response OR at least returning fine.
    # If not in response, fail with helpful error.
    for k in ("transcript", "sentiment", "vapi_call_id"):
        assert k in sample, f"Missing new Call field: {k} -- got keys={list(sample.keys())}"


# ---------- /api/ai/status ----------
def test_ai_status_all_false_initially(admin_headers):
    r = requests.get(f"{API}/ai/status", timeout=10)
    assert r.status_code == 200
    j = r.json()
    for k in ("deepseek_configured", "vapi_configured", "whatsapp_configured",
              "automation_auto_reply", "automation_followup"):
        assert k in j, f"missing key {k}"
        assert isinstance(j[k], bool)
        assert j[k] is False, f"expected {k}=False, got {j[k]}"


# ---------- DeepSeek-backed endpoints return 503 without key ----------
def test_ai_whatsapp_reply_503(admin_headers):
    r = requests.post(f"{API}/ai/whatsapp-reply/1", headers=admin_headers, timeout=15)
    assert r.status_code == 503, r.text
    assert "DEEPSEEK_API_KEY" in r.text


def test_ai_call_insights_503(admin_headers):
    # find an existing call id
    rc = requests.get(f"{API}/calls", params={"lead_id": 1}, headers=admin_headers, timeout=10)
    items = rc.json()
    if not items:
        pytest.skip("no call to test against")
    cid = items[0]["id"]
    r = requests.post(f"{API}/ai/call-insights/{cid}", headers=admin_headers, timeout=15)
    assert r.status_code == 503, r.text
    assert "DEEPSEEK_API_KEY" in r.text


def test_ai_call_script_503(admin_headers):
    r = requests.post(f"{API}/ai/call-script/1", headers=admin_headers, timeout=15)
    assert r.status_code == 503, r.text
    assert "DEEPSEEK_API_KEY" in r.text


# ---------- Vapi voice ----------
def test_voice_status(admin_headers):
    r = requests.get(f"{API}/voice/status", timeout=10)
    assert r.status_code == 200
    assert r.json().get("vapi_configured") is False


def test_voice_place_call_503(admin_headers):
    r = requests.post(f"{API}/voice/place-call/1", headers=admin_headers, timeout=15)
    assert r.status_code == 503, r.text
    # detail should mention VAPI
    assert "VAPI" in r.text.upper()


def test_voice_webhook_unknown_call_id():
    body = {"message": {"type": "end-of-call-report", "call": {"id": "unknown"}, "durationSeconds": 60}}
    r = requests.post(f"{API}/voice/webhook", json=body, timeout=10)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j.get("ok") is True
    assert j.get("ignored") == "unknown call"


def test_voice_webhook_no_call_id():
    r = requests.post(f"{API}/voice/webhook", json={"message": {"type": "status-update"}}, timeout=10)
    assert r.status_code == 200
    assert r.json().get("ignored") in ("no vapi call id", "unknown call")


def test_voice_webhook_full_flow_via_sqlite(admin_headers):
    """Create a Call, stamp vapi_call_id in sqlite, then POST end-of-call-report and verify."""
    # 1) Create a fresh call
    rc = requests.post(f"{API}/calls", json={"lead_id": 1, "direction": "Outgoing",
                                              "outcome": "Connected", "notes": "TEST_voice_webhook"},
                       headers=admin_headers, timeout=10)
    assert rc.status_code in (200, 201), rc.text
    cid = rc.json()["id"]
    vapi_id = f"vp_smoke_{int(time.time())}"

    # 2) Direct sqlite update to assign vapi_call_id (API doesn't expose it)
    try:
        conn = sqlite3.connect(SQLITE_PATH)
        cur = conn.cursor()
        cur.execute("UPDATE calls SET vapi_call_id=? WHERE id=?", (vapi_id, cid))
        conn.commit()
        conn.close()
    except Exception as e:
        pytest.skip(f"cannot access sqlite directly: {e}")

    # 3) POST webhook end-of-call-report
    payload = {
        "message": {
            "type": "end-of-call-report",
            "call": {"id": vapi_id},
            "durationSeconds": 75,
            "summary": "TEST_smoke summary",
            "transcript": "Hi this is a test transcript.",
            "analysis": {"sentiment": "positive", "successEvaluation": "Schedule store visit"},
        }
    }
    r = requests.post(f"{API}/voice/webhook", json=payload, timeout=10)
    assert r.status_code == 200, r.text
    assert r.json().get("ok") is True
    assert r.json().get("ignored") is None or "ignored" not in r.json()

    # 4) Verify Call row updated
    rget = requests.get(f"{API}/calls/{cid}", headers=admin_headers, timeout=10)
    assert rget.status_code == 200
    cdata = rget.json()
    assert cdata["call_status"] == "Completed", cdata
    assert cdata.get("transcript") and "test transcript" in cdata["transcript"].lower()
    assert cdata.get("sentiment") == "Positive"

    # 5) AIAgentLog row appeared for this lead
    rlog = requests.get(f"{API}/ai-logs", params={"lead_id": 1}, headers=admin_headers, timeout=10)
    assert rlog.status_code == 200
    logs = rlog.json()
    assert any("TEST_smoke" in (lg.get("conversation_summary") or "") for lg in logs), \
        "expected an AIAgentLog entry containing the test summary"


# ---------- WhatsApp Cloud webhook ----------
def test_whatsapp_verify_handshake_ok():
    r = requests.get(f"{API}/whatsapp/webhook", params={
        "hub.mode": "subscribe",
        "hub.verify_token": "facets-verify",
        "hub.challenge": "hello42",
    }, timeout=10)
    assert r.status_code == 200, r.text
    assert r.text == "hello42"


def test_whatsapp_verify_handshake_wrong_token():
    r = requests.get(f"{API}/whatsapp/webhook", params={
        "hub.mode": "subscribe",
        "hub.verify_token": "WRONG",
        "hub.challenge": "hello42",
    }, timeout=10)
    assert r.status_code == 403


def test_whatsapp_webhook_is_public_no_auth():
    """Webhook POST must NOT require auth (Meta calls it)."""
    r = requests.post(f"{API}/whatsapp/webhook", json={"object": "whatsapp_business_account", "entry": []}, timeout=10)
    assert r.status_code == 200, r.text


def test_whatsapp_webhook_inbound_creates_lead(admin_headers):
    phone_digits = "919812345678"
    name = "Reg Test Buyer"
    payload = {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "ENTRY",
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {"display_phone_number": "+9190000", "phone_number_id": "PNID"},
                    "contacts": [{"profile": {"name": name}, "wa_id": phone_digits}],
                    "messages": [{
                        "from": phone_digits,
                        "id": f"wamid.TEST{int(time.time())}",
                        "timestamp": str(int(time.time())),
                        "type": "text",
                        "text": {"body": "Hi looking for bridal necklace"},
                    }],
                },
                "field": "messages",
            }],
        }],
    }
    r = requests.post(f"{API}/whatsapp/webhook", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("ok") is True
    assert body.get("received") == 1

    # Verify lead was auto-created (or matched) with phone ending in 9812345678
    rl = requests.get(f"{API}/leads", params={"page_size": 50, "search": "9812345678"},
                      headers=admin_headers, timeout=15)
    # search query may or may not be supported; fallback to scan
    matched = None
    if rl.status_code == 200:
        for item in rl.json().get("items", []):
            if item.get("phone", "").endswith("9812345678"):
                matched = item
                break
    if matched is None:
        # Scan first few pages
        for page in range(1, 6):
            rl2 = requests.get(f"{API}/leads", params={"page": page, "page_size": 100},
                               headers=admin_headers, timeout=15)
            if rl2.status_code != 200:
                break
            for item in rl2.json().get("items", []):
                if item.get("phone", "").endswith("9812345678"):
                    matched = item
                    break
            if matched:
                break
    assert matched is not None, "lead not auto-created from WhatsApp inbound"
    assert matched.get("source") == "WhatsApp"
    assert matched.get("status") == "New"

    # Verify WhatsappMessage row exists with direction=in
    rt = requests.get(f"{API}/whatsapp/{matched['id']}", headers=admin_headers, timeout=10)
    assert rt.status_code == 200
    thread = rt.json()
    assert any(m.get("direction") == "in" and "bridal necklace" in (m.get("message") or "").lower()
               for m in thread), f"no inbound WhatsApp message persisted: {thread}"


def test_whatsapp_send_external_local_fallback(admin_headers):
    # use existing lead 1 (must have phone)
    payload = {"text": "TEST_external send"}
    r = requests.post(f"{API}/whatsapp/send-external/1", json=payload,
                      headers=admin_headers, timeout=15)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j.get("ok") is True
    assert j.get("delivered_via_cloud") is False
    msg_id = j.get("id")
    assert isinstance(msg_id, int)

    # Confirm message persisted
    rt = requests.get(f"{API}/whatsapp/1", headers=admin_headers, timeout=10)
    assert rt.status_code == 200
    assert any(m["id"] == msg_id and m["direction"] == "out" for m in rt.json())


def test_whatsapp_send_external_requires_auth():
    r = requests.post(f"{API}/whatsapp/send-external/1", json={"text": "x"}, timeout=10)
    assert r.status_code == 401, f"expected 401, got {r.status_code} {r.text}"
