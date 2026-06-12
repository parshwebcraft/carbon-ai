"""Smoke tests for Facets CRM API (run after seed.py).

Usage:
    python test_api.py [base_url]
"""
import os
import sys
import json
import urllib.request
import urllib.error


BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8001"


def req(method, path, token=None, body=None):
    url = f"{BASE}{path}"
    data = None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if body is not None:
        data = json.dumps(body).encode()
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            return resp.status, json.loads(resp.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"null")


def main():
    print("> GET /api/health")
    code, data = req("GET", "/api/health")
    assert code == 200, data
    print("   ok", data)

    print("> POST /api/auth/login")
    code, data = req("POST", "/api/auth/login", body={
        "email": "admin@facetscrm.com", "password": "password123"})
    assert code == 200, data
    token = data["access_token"]
    print("   ok user=", data["user"]["email"], "role=", data["user"]["role"])

    print("> GET /api/auth/me")
    code, data = req("GET", "/api/auth/me", token=token)
    assert code == 200, data
    print("   ok", data["email"])

    for path in [
        "/api/leads?page=1&page_size=5",
        "/api/tasks",
        "/api/calls",
        "/api/whatsapp/conversations",
        "/api/products",
        "/api/appointments",
        "/api/quotations",
        "/api/ai-logs",
        "/api/notifications",
        "/api/users",
        "/api/dashboard/stats",
    ]:
        code, data = req("GET", path, token=token)
        if isinstance(data, list):
            n = len(data)
        elif isinstance(data, dict):
            n = len(data.get("items", data.keys()))
        else:
            n = 0
        print(f"> GET {path}  -> {code}, rows={n}")
        assert code == 200, data

    print("ALL GOOD.")


if __name__ == "__main__":
    main()
