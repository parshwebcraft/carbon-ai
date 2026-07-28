"""Razorpay payment service."""
from __future__ import annotations

import hmac
import os
from hashlib import sha256

import requests
from fastapi import HTTPException

from repositories.payments import PaymentRepository


PAYMENT_PLANS = {
    "starter": {
        "name": "Starter",
        "amount_paise": 999900,
        "currency": "INR",
        "description": "ParshCall AI Starter monthly plan",
    },
    "growth": {
        "name": "Growth",
        "amount_paise": 3499900,
        "currency": "INR",
        "description": "ParshCall AI Growth monthly plan",
    },
    "business": {
        "name": "Business / Professional",
        "amount_paise": 7499900,
        "currency": "INR",
        "description": "ParshCall AI Business / Professional monthly plan",
    },
}


class PaymentService:
    def __init__(self, repository: PaymentRepository):
        self.repository = repository
        self.key_id = os.environ.get("RAZORPAY_KEY_ID", "").strip()
        self.key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "").strip()

    def create_order(self, plan_id: str, customer: dict | None = None) -> dict:
        plan = PAYMENT_PLANS.get(plan_id)
        if not plan:
            raise HTTPException(status_code=400, detail="plan_id must be starter, growth, or business")
        if not self.key_id or not self.key_secret:
            raise HTTPException(status_code=503, detail="Razorpay environment variables are not configured")

        try:
            response = requests.post(
                "https://api.razorpay.com/v1/orders",
                auth=(self.key_id, self.key_secret),
                json={
                    "amount": plan["amount_paise"],
                    "currency": plan["currency"],
                    "payment_capture": 1,
                    "notes": {
                        "plan_id": plan_id,
                        "plan_name": plan["name"],
                    },
                },
                timeout=20,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            raise HTTPException(status_code=502, detail=f"Razorpay order creation failed: {exc}") from exc

        order = response.json()
        record = self.repository.create_payment_order(
            plan_id=plan_id,
            plan_name=plan["name"],
            amount_paise=plan["amount_paise"],
            currency=plan["currency"],
            razorpay_order_id=order["id"],
            customer=customer or {},
        )
        return {
            "payment_id": record.id,
            "key_id": self.key_id,
            "order_id": order["id"],
            "amount": plan["amount_paise"],
            "currency": plan["currency"],
            "plan_id": plan_id,
            "plan_name": plan["name"],
            "description": plan["description"],
        }

    def verify_payment(self, *, order_id: str, payment_id: str, signature: str) -> dict:
        if not self.key_secret:
            raise HTTPException(status_code=503, detail="Razorpay environment variables are not configured")

        expected = hmac.new(
            self.key_secret.encode("utf-8"),
            f"{order_id}|{payment_id}".encode("utf-8"),
            sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=400, detail="Invalid Razorpay payment signature")

        record = self.repository.get_by_order_id(order_id)
        if not record:
            raise HTTPException(status_code=404, detail="Payment order not found")

        verified = self.repository.mark_verified(
            record,
            razorpay_payment_id=payment_id,
            razorpay_signature=signature,
        )
        return {
            "ok": True,
            "payment_id": verified.id,
            "plan_id": verified.plan_id,
            "status": verified.status,
        }

    def capture_pricing_lead(
        self,
        *,
        name: str,
        email: str,
        company: str,
        expected_call_volume: str,
        plan_id: str,
    ) -> dict:
        lead = self.repository.create_pricing_lead(
            name=name,
            email=email,
            company=company,
            expected_call_volume=expected_call_volume,
            plan_id=plan_id,
        )
        return {"ok": True, "lead_id": lead.id, "status": lead.status}
