"""End-to-end backend tests for Facets Jewellery CRM."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://facets-crm-mvp.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@facetscrm.com"
ADMIN_PASS = "password123"
SALES_EMAIL = "aditi.kapoor@facetscrm.com"
SALES_PASS = "password123"


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def admin_tokens():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=30)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="session")
def admin_headers(admin_tokens):
    return {"Authorization": f"Bearer {admin_tokens['access_token']}"}


@pytest.fixture(scope="session")
def sales_tokens():
    r = requests.post(f"{API}/auth/login", json={"email": SALES_EMAIL, "password": SALES_PASS}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"sales login failed: {r.status_code} {r.text}")
    return r.json()


@pytest.fixture(scope="session")
def sales_headers(sales_tokens):
    return {"Authorization": f"Bearer {sales_tokens['access_token']}"}


# ---------- health ----------
def test_health():
    r = requests.get(f"{API}/health", timeout=10)
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# ---------- auth ----------
def test_login_wrong_password():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=10)
    assert r.status_code == 401


def test_login_admin(admin_tokens):
    assert "access_token" in admin_tokens
    assert "refresh_token" in admin_tokens
    assert admin_tokens["user"]["role"] == "Admin"
    assert admin_tokens["user"]["email"].lower() == ADMIN_EMAIL


def test_auth_me(admin_headers):
    r = requests.get(f"{API}/auth/me", headers=admin_headers, timeout=10)
    assert r.status_code == 200
    assert r.json()["email"].lower() == ADMIN_EMAIL


def test_refresh_token(admin_tokens):
    r = requests.post(f"{API}/auth/refresh", json={"refresh_token": admin_tokens["refresh_token"]}, timeout=10)
    assert r.status_code == 200, r.text
    assert "access_token" in r.json()


# ---------- leads ----------
def test_leads_pagination(admin_headers):
    r = requests.get(f"{API}/leads", params={"page": 1, "page_size": 5}, headers=admin_headers, timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j["page"] == 1
    assert j["page_size"] == 5
    assert len(j["items"]) == 5
    assert j["total"] >= 100


def test_leads_filter_status(admin_headers):
    r = requests.get(f"{API}/leads", params={"status": "New", "page_size": 50}, headers=admin_headers, timeout=15)
    assert r.status_code == 200
    for item in r.json()["items"]:
        assert item["status"] == "New"


def test_leads_filter_source(admin_headers):
    r = requests.get(f"{API}/leads", params={"source": "Website", "page_size": 50}, headers=admin_headers, timeout=15)
    assert r.status_code == 200
    for item in r.json()["items"]:
        assert item["source"] == "Website"


@pytest.fixture(scope="session")
def created_lead(admin_headers):
    payload = {"name": "TEST_Lead Crud", "phone": "+919000099000", "email": "test_lead@x.com", "status": "New", "source": "Website"}
    r = requests.post(f"{API}/leads", json=payload, headers=admin_headers, timeout=15)
    assert r.status_code in (200, 201), r.text
    return r.json()


def test_lead_create_get_update(created_lead, admin_headers):
    lid = created_lead["id"]
    r = requests.get(f"{API}/leads/{lid}", headers=admin_headers, timeout=10)
    assert r.status_code == 200
    assert r.json()["name"] == "TEST_Lead Crud"

    r2 = requests.put(f"{API}/leads/{lid}", json={"name": "TEST_Lead Updated"}, headers=admin_headers, timeout=10)
    assert r2.status_code == 200
    assert r2.json()["name"] == "TEST_Lead Updated"

    r3 = requests.get(f"{API}/leads/{lid}", headers=admin_headers, timeout=10)
    assert r3.json()["name"] == "TEST_Lead Updated"


def test_sales_cannot_delete_lead(created_lead, sales_headers):
    r = requests.delete(f"{API}/leads/{created_lead['id']}", headers=sales_headers, timeout=10)
    assert r.status_code == 403


def test_admin_can_delete_lead(created_lead, admin_headers):
    lid = created_lead["id"]
    r = requests.delete(f"{API}/leads/{lid}", headers=admin_headers, timeout=10)
    assert r.status_code in (200, 204)
    r2 = requests.get(f"{API}/leads/{lid}", headers=admin_headers, timeout=10)
    assert r2.status_code == 404


# ---------- activities ----------
def test_activities_list_and_create(admin_headers):
    r = requests.get(f"{API}/activities", params={"lead_id": 1}, headers=admin_headers, timeout=10)
    assert r.status_code == 200
    assert isinstance(r.json(), list)

    payload = {"lead_id": 1, "activity_type": "Note", "description": "TEST_activity"}
    r2 = requests.post(f"{API}/activities", json=payload, headers=admin_headers, timeout=10)
    assert r2.status_code in (200, 201), r2.text
    j = r2.json()
    assert j["lead_id"] == 1
    assert j["activity_type"] == "Note"


# ---------- tasks ----------
def test_tasks_crud(admin_headers):
    r = requests.get(f"{API}/tasks", headers=admin_headers, timeout=10)
    assert r.status_code == 200

    payload = {"title": "TEST_Task", "status": "Open", "lead_id": 1}
    rc = requests.post(f"{API}/tasks", json=payload, headers=admin_headers, timeout=10)
    assert rc.status_code in (200, 201), rc.text
    tid = rc.json()["id"]

    ru = requests.put(f"{API}/tasks/{tid}", json={"status": "In Progress"}, headers=admin_headers, timeout=10)
    assert ru.status_code == 200
    assert ru.json()["status"] == "In Progress"

    ru2 = requests.put(f"{API}/tasks/{tid}", json={"status": "Completed"}, headers=admin_headers, timeout=10)
    assert ru2.json()["status"] == "Completed"

    rd = requests.delete(f"{API}/tasks/{tid}", headers=admin_headers, timeout=10)
    assert rd.status_code in (200, 204)


# ---------- calls ----------
def test_calls_crud_and_filter(admin_headers):
    r = requests.get(f"{API}/calls", params={"lead_id": 1}, headers=admin_headers, timeout=10)
    assert r.status_code == 200

    rc = requests.post(f"{API}/calls", json={"lead_id": 1, "direction": "Outgoing", "outcome": "Connected", "notes": "TEST_call"}, headers=admin_headers, timeout=10)
    assert rc.status_code in (200, 201), rc.text
    cid = rc.json()["id"]

    ru = requests.put(f"{API}/calls/{cid}", json={"notes": "TEST_call_updated"}, headers=admin_headers, timeout=10)
    assert ru.status_code == 200

    rd = requests.delete(f"{API}/calls/{cid}", headers=admin_headers, timeout=10)
    assert rd.status_code in (200, 204)


# ---------- whatsapp ----------
def test_whatsapp_conversations(admin_headers):
    r = requests.get(f"{API}/whatsapp/conversations", headers=admin_headers, timeout=10)
    assert r.status_code == 200
    convos = r.json()
    assert isinstance(convos, list)
    assert len(convos) >= 1
    if convos:
        assert "lead_name" in convos[0] and "last_message" in convos[0]


def test_whatsapp_thread_and_send(admin_headers):
    r = requests.get(f"{API}/whatsapp/conversations", headers=admin_headers, timeout=10)
    convos = r.json()
    if not convos:
        pytest.skip("no whatsapp conversations seeded")
    lead_id = convos[0]["lead_id"]
    rt = requests.get(f"{API}/whatsapp/{lead_id}", headers=admin_headers, timeout=10)
    assert rt.status_code == 200
    thread = rt.json()
    assert isinstance(thread, list)

    rs = requests.post(f"{API}/whatsapp", json={"lead_id": lead_id, "direction": "Outgoing", "message": "TEST_wamsg"}, headers=admin_headers, timeout=10)
    assert rs.status_code in (200, 201), rs.text


# ---------- products ----------
def test_products_list_and_filter(admin_headers):
    r = requests.get(f"{API}/products", headers=admin_headers, timeout=10)
    assert r.status_code == 200
    r2 = requests.get(f"{API}/products", params={"metal_type": "Gold"}, headers=admin_headers, timeout=10)
    assert r2.status_code == 200


def test_products_sales_forbidden(sales_headers):
    payload = {"product_name": "TEST_Ring", "sku": f"TST-{int(time.time())}", "metal_type": "Gold", "category": "Ring", "price_inr": 100000}
    r = requests.post(f"{API}/products", json=payload, headers=sales_headers, timeout=10)
    assert r.status_code == 403


def test_products_admin_create(admin_headers):
    payload = {"product_name": "TEST_Ring", "sku": f"TST-{int(time.time())}", "metal_type": "Gold", "category": "Ring", "price_inr": 100000}
    r = requests.post(f"{API}/products", json=payload, headers=admin_headers, timeout=10)
    assert r.status_code in (200, 201), r.text


# ---------- appointments ----------
def test_appointments_crud(admin_headers):
    r = requests.get(f"{API}/appointments", headers=admin_headers, timeout=10)
    assert r.status_code == 200
    payload = {"lead_id": 1, "customer_name": "TEST_Customer", "appointment_date": "2026-02-01T10:00:00", "status": "Scheduled"}
    rc = requests.post(f"{API}/appointments", json=payload, headers=admin_headers, timeout=10)
    assert rc.status_code in (200, 201), rc.text
    aid = rc.json()["id"]
    ru = requests.put(f"{API}/appointments/{aid}", json={"status": "Completed"}, headers=admin_headers, timeout=10)
    assert ru.status_code == 200
    rd = requests.delete(f"{API}/appointments/{aid}", headers=admin_headers, timeout=10)
    assert rd.status_code in (200, 204)


# ---------- quotations ----------
def test_quotations_create_auto_number(admin_headers):
    r = requests.get(f"{API}/quotations", headers=admin_headers, timeout=10)
    assert r.status_code == 200
    payload = {"lead_id": 1, "total_amount": 250000, "status": "Draft"}
    rc = requests.post(f"{API}/quotations", json=payload, headers=admin_headers, timeout=10)
    assert rc.status_code in (200, 201), rc.text
    j = rc.json()
    qn = j.get("quotation_number", "")
    assert qn.startswith("QT-"), f"unexpected quotation_number: {qn}"
    qid = j["id"]
    ru = requests.put(f"{API}/quotations/{qid}", json={"status": "Sent"}, headers=admin_headers, timeout=10)
    assert ru.status_code == 200
    assert ru.json()["status"] == "Sent"


# ---------- ai logs ----------
def test_ai_logs(admin_headers):
    r = requests.get(f"{API}/ai-logs", headers=admin_headers, timeout=10)
    assert r.status_code == 200
    r2 = requests.get(f"{API}/ai-logs", params={"lead_id": 1}, headers=admin_headers, timeout=10)
    assert r2.status_code == 200


# ---------- notifications ----------
def test_notifications_list_and_mark_read(admin_headers):
    r = requests.get(f"{API}/notifications", headers=admin_headers, timeout=10)
    assert r.status_code == 200
    items = r.json()
    if items:
        nid = items[0]["id"]
        r2 = requests.post(f"{API}/notifications/{nid}/read", headers=admin_headers, timeout=10)
        assert r2.status_code in (200, 204)


# ---------- users ----------
def test_users_list_any_role(sales_headers):
    r = requests.get(f"{API}/users", headers=sales_headers, timeout=10)
    assert r.status_code == 200


def test_users_create_admin_only(sales_headers, admin_headers):
    payload = {"name": "TEST_User", "email": f"testuser_{int(time.time())}@x.com", "password": "password123", "role": "Sales"}
    rf = requests.post(f"{API}/users", json=payload, headers=sales_headers, timeout=10)
    assert rf.status_code == 403
    ra = requests.post(f"{API}/users", json=payload, headers=admin_headers, timeout=10)
    assert ra.status_code in (200, 201), ra.text


# ---------- dashboard ----------
def test_dashboard_stats(admin_headers):
    r = requests.get(f"{API}/dashboard/stats", headers=admin_headers, timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j["total_leads"] >= 100
    assert isinstance(j["pipeline_value"], (int, float))
    assert isinstance(j["lead_status_distribution"], dict)
    assert "task_completion_rate" in j
