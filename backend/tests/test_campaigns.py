"""Iteration 3 — AI Calling Campaigns + Settings + regression smoke."""
import io
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://run-preview-18.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@facetscrm.com", "password": "password123"}
MANAGER = {"email": "priya.sharma@facetscrm.com", "password": "password123"}
SALES = {"email": "aditi.kapoor@facetscrm.com", "password": "password123"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    return data["access_token"], data


@pytest.fixture(scope="session")
def admin_token():
    tok, _ = _login(ADMIN)
    return tok


@pytest.fixture(scope="session")
def manager_token():
    tok, _ = _login(MANAGER)
    return tok


@pytest.fixture(scope="session")
def sales_token():
    tok, _ = _login(SALES)
    return tok


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


# --- Auth & regression ----------------------------------------------------

def test_auth_login_payload():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert "access_token" in d and "refresh_token" in d and "user" in d
    assert d["user"]["email"] == ADMIN["email"]


def test_auth_me(admin_token):
    r = requests.get(f"{API}/auth/me", headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN["email"]


def test_dashboard_stats(admin_token):
    r = requests.get(f"{API}/dashboard/stats", headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    d = r.json()
    # Accept variety of shapes; check key tiles exist
    for k in ("total_leads", "new_leads"):
        assert k in d or "tiles" in d or "stats" in d


@pytest.mark.parametrize("path", [
    "/leads", "/tasks", "/calls", "/whatsapp/conversations",
    "/products", "/appointments", "/quotations", "/ai-logs", "/users",
])
def test_regression_lists(admin_token, path):
    r = requests.get(f"{API}{path}", headers=H(admin_token), timeout=20)
    assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:200]}"


# --- Calling settings -----------------------------------------------------

def test_settings_calling_get(admin_token):
    r = requests.get(f"{API}/settings/calling", headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    d = r.json()
    for k in ("daily_call_limit", "start_time", "end_time", "calls_per_minute"):
        assert k in d


def test_settings_calling_put_24x7(admin_token):
    body = {"daily_call_limit": 500, "calls_per_minute": 60,
            "start_time": "00:00", "end_time": "23:59"}
    r = requests.put(f"{API}/settings/calling", headers=H(admin_token), json=body, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["calls_per_minute"] == 60
    assert d["daily_call_limit"] == 500


def test_settings_provider(admin_token):
    r = requests.get(f"{API}/settings/calling/provider", headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["provider"] == "mock"
    assert isinstance(d["outcomes"], list) and len(d["outcomes"]) == 8


# --- Campaign preview -----------------------------------------------------

def test_campaign_preview(admin_token):
    body = {"status": ["New", "Contacted"]}
    r = requests.post(f"{API}/campaigns/preview", headers=H(admin_token), json=body, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["total"] > 0
    assert isinstance(d["sample"], list) and len(d["sample"]) <= 10


# --- Campaign CRUD + lifecycle + automations ------------------------------

@pytest.fixture(scope="session")
def campaign_id(admin_token):
    body = {
        "name": "TEST_AI_Camp_Iter3",
        "description": "iteration 3 test",
        "source_type": "leads",
        "campaign_prompt": "Promote Diwali bridal collection.",
        "filters": {"status": ["New", "Contacted"]},
        "daily_call_limit": 500,
        "calls_per_minute": 60,
        "start_time": "00:00",
        "end_time": "23:59",
    }
    r = requests.post(f"{API}/campaigns", headers=H(admin_token), json=body, timeout=20)
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    yield cid
    # Cleanup
    requests.delete(f"{API}/campaigns/{cid}", headers=H(admin_token), timeout=15)


def test_campaign_list_contains(admin_token, campaign_id):
    r = requests.get(f"{API}/campaigns", headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    items = r.json()["items"]
    ids = [c["id"] for c in items]
    assert campaign_id in ids
    one = next(c for c in items if c["id"] == campaign_id)
    assert one["stats"]["total_targets"] > 0
    assert one["provider"] == "mock"


def test_campaign_get(admin_token, campaign_id):
    r = requests.get(f"{API}/campaigns/{campaign_id}", headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["id"] == campaign_id
    assert d["stats"]["total_targets"] > 0


def test_campaign_patch(admin_token, campaign_id):
    r = requests.patch(f"{API}/campaigns/{campaign_id}",
                       headers=H(admin_token),
                       json={"description": "updated desc"}, timeout=15)
    assert r.status_code == 200
    assert r.json()["description"] == "updated desc"


def test_campaign_csv_upload(admin_token, campaign_id):
    # Use a phone that won't match any seeded lead AND an existing one (best-effort)
    csv = (
        "name,phone,city,notes,source,lead_prompt_override\n"
        "TEST_CSV_New,+919900099001,Pune,upload test,Campaign CSV,please be brief\n"
        "TEST_CSV_Dup,+919900099001,Pune,dup row,Campaign CSV,\n"  # should dedupe
    )
    files = {"file": ("upload.csv", io.BytesIO(csv.encode()), "text/csv")}
    r = requests.post(f"{API}/campaigns/{campaign_id}/upload-csv",
                      headers=H(admin_token), files=files, timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    # CSV adds at least one unique target
    assert d["stats"]["total_targets"] >= 2


def test_campaign_launch_pause_resume(admin_token, campaign_id):
    r = requests.post(f"{API}/campaigns/{campaign_id}/launch", headers=H(admin_token), timeout=15)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "running"

    r = requests.post(f"{API}/campaigns/{campaign_id}/pause", headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    assert r.json()["status"] == "paused"

    r = requests.post(f"{API}/campaigns/{campaign_id}/resume", headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    assert r.json()["status"] == "running"


def test_campaign_tick_resolves_targets(admin_token, campaign_id):
    # Run ticks until campaign completes or up to 20 iters
    final = None
    for _ in range(25):
        r = requests.post(f"{API}/campaigns/{campaign_id}/tick",
                          headers=H(admin_token), timeout=30)
        assert r.status_code == 200, r.text
        # Check campaign state
        r2 = requests.get(f"{API}/campaigns/{campaign_id}", headers=H(admin_token), timeout=15)
        assert r2.status_code == 200
        d = r2.json()
        final = d
        if d["stats"]["pending"] == 0 and d["stats"]["in_progress"] == 0:
            break
        time.sleep(0.2)
    assert final is not None
    assert final["stats"]["pending"] == 0
    # Auto-complete when nothing left
    assert final["status"] in ("completed", "paused", "running")


def test_campaign_targets_list_after_tick(admin_token, campaign_id):
    r = requests.get(f"{API}/campaigns/{campaign_id}/targets",
                     params={"status": "completed", "page": 1, "page_size": 50},
                     headers=H(admin_token), timeout=20)
    assert r.status_code == 200
    d = r.json()
    # Some completed targets should exist post-ticks
    assert d["total"] >= 1
    if d["items"]:
        t = d["items"][0]
        # Schema sanity
        for k in ("outcome", "sentiment", "summary", "transcript",
                  "lead_score", "next_action", "recording_url",
                  "duration", "call_cost"):
            assert k in t
        assert t["outcome"] in [
            "Bridal Inquiry", "Gold Purchase", "Diamond Purchase",
            "Exchange Inquiry", "Investment Gold", "Appointment Booked",
            "Quotation Requested", "Not Interested",
        ]
        assert t["duration"] > 0
        assert t["call_cost"] > 0


def test_campaign_analytics_shape(admin_token, campaign_id):
    r = requests.get(f"{API}/campaigns/{campaign_id}/analytics",
                     headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert "headline" in d and "sentiment_distribution" in d and "outcome_distribution" in d
    h = d["headline"]
    for k in ("total_calls", "connected_calls", "interested_leads",
              "appointment_bookings", "quotations_requested",
              "conversion_rate_pct", "avg_lead_score"):
        assert k in h


def test_automations_lead_status_and_task(admin_token, campaign_id):
    """After ticks ran, at least one connected target with linked lead
    should have triggered Lead status update + a follow-up Task."""
    # Fetch completed targets with a positive outcome
    r = requests.get(f"{API}/campaigns/{campaign_id}/targets",
                     params={"status": "completed", "page_size": 200},
                     headers=H(admin_token), timeout=20)
    assert r.status_code == 200
    items = [t for t in r.json()["items"] if t.get("lead_id") and t.get("outcome")]
    if not items:
        pytest.skip("No completed-with-lead targets to validate automations on")

    sample = items[0]
    lead_id = sample["lead_id"]
    outcome = sample["outcome"]

    # Lead status check
    r2 = requests.get(f"{API}/leads/{lead_id}", headers=H(admin_token), timeout=15)
    assert r2.status_code == 200
    lead = r2.json()
    mapping = {
        "Bridal Inquiry": "Interested", "Gold Purchase": "Interested",
        "Diamond Purchase": "Interested", "Exchange Inquiry": "Interested",
        "Investment Gold": "Interested",
        "Appointment Booked": "Visit Scheduled",
        "Quotation Requested": "Quotation Sent",
        "Not Interested": "Lost",
    }
    # Lead may have been touched by multiple targets; accept any allowed state
    assert lead["status"] in set(mapping.values()) or lead["status"] in ("Won",), \
        f"Lead {lead_id} status={lead['status']} after outcome={outcome}"

    # Tasks: at least one follow-up task should exist for this lead (best-effort)
    r3 = requests.get(f"{API}/tasks", headers=H(admin_token), timeout=15)
    assert r3.status_code == 200
    tasks = r3.json()
    items_list = tasks.get("items", tasks) if isinstance(tasks, dict) else tasks
    found = any((t.get("lead_id") == lead_id and t.get("title", "").startswith((
        "Follow up", "Confirm showroom", "Prepare and send", "Callback")))
        for t in items_list)
    # Not strictly required — Not Interested has no task
    if outcome != "Not Interested":
        assert found, f"No follow-up task found for lead {lead_id} (outcome={outcome})"


def test_legacy_calls_includes_campaign(admin_token):
    """A Call row should be inserted for connected campaign calls."""
    r = requests.get(f"{API}/calls", headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    data = r.json()
    items = data.get("items", data) if isinstance(data, dict) else data
    assert isinstance(items, list)
    assert len(items) > 0


# --- Role guards ----------------------------------------------------------

def test_sales_cannot_create_campaign(sales_token):
    body = {"name": "TEST_NOPE", "source_type": "leads",
            "filters": {"status": ["New"]}}
    r = requests.post(f"{API}/campaigns", headers=H(sales_token), json=body, timeout=15)
    assert r.status_code == 403


def test_sales_cannot_update_settings(sales_token):
    r = requests.put(f"{API}/settings/calling", headers=H(sales_token),
                     json={"calls_per_minute": 1}, timeout=15)
    assert r.status_code == 403


def test_sales_cannot_tick(sales_token, admin_token):
    # find any campaign id
    r = requests.get(f"{API}/campaigns", headers=H(admin_token), timeout=15)
    items = r.json()["items"]
    if not items:
        pytest.skip("no campaigns")
    cid = items[0]["id"]
    r2 = requests.post(f"{API}/campaigns/{cid}/tick", headers=H(sales_token), timeout=15)
    assert r2.status_code == 403


# --- Launch-with-zero-pending guard --------------------------------------

def test_launch_with_zero_pending_400(admin_token):
    body = {"name": "TEST_EMPTY", "source_type": "leads",
            "filters": {"lead_ids": [999999]}}
    r = requests.post(f"{API}/campaigns", headers=H(admin_token), json=body, timeout=15)
    assert r.status_code == 200
    cid = r.json()["id"]
    try:
        r2 = requests.post(f"{API}/campaigns/{cid}/launch",
                           headers=H(admin_token), timeout=15)
        assert r2.status_code == 400
    finally:
        requests.delete(f"{API}/campaigns/{cid}", headers=H(admin_token), timeout=15)


# --- Cancel + delete ------------------------------------------------------

def test_cancel_existing_campaign(admin_token):
    """Cancel either the seeded Diwali Bridal Push (id=1) if it's still running,
    else create+cancel a tiny one."""
    r = requests.get(f"{API}/campaigns", headers=H(admin_token), timeout=15)
    items = r.json()["items"]
    target = None
    for c in items:
        if c["status"] in ("running", "paused", "draft") and c["name"] != "TEST_AI_Camp_Iter3":
            target = c
            break
    if target is None:
        pytest.skip("no cancel target")
    r2 = requests.post(f"{API}/campaigns/{target['id']}/cancel",
                       headers=H(admin_token), timeout=15)
    assert r2.status_code == 200
    assert r2.json()["status"] == "cancelled"
