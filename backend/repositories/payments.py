"""Payment repository for Razorpay checkout records."""
from __future__ import annotations

from sqlalchemy.orm import Session

from database import Base
from models import utcnow, uuid_str
from sqlalchemy import Column, DateTime, Integer, JSON, String, Text


class PaymentRecord(Base):
    __tablename__ = "payments"
    id = Column(String(36), primary_key=True, default=uuid_str)
    plan_id = Column(String(40), nullable=False, index=True)
    plan_name = Column(String(80), nullable=False)
    amount_paise = Column(Integer, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    status = Column(String(30), default="created", nullable=False, index=True)
    razorpay_order_id = Column(String(120), unique=True, index=True, nullable=False)
    razorpay_payment_id = Column(String(120), index=True)
    razorpay_signature = Column(Text)
    customer = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    verified_at = Column(DateTime)


class PricingLeadCapture(Base):
    __tablename__ = "pricing_leads"
    id = Column(String(36), primary_key=True, default=uuid_str)
    name = Column(String(160), nullable=False)
    email = Column(String(180), nullable=False, index=True)
    company = Column(String(180), nullable=False)
    expected_call_volume = Column(String(120), nullable=False)
    plan_id = Column(String(40), default="custom", nullable=False)
    source = Column(String(80), default="pricing_page", nullable=False)
    status = Column(String(30), default="new", nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class PaymentRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_payment_order(
        self,
        *,
        plan_id: str,
        plan_name: str,
        amount_paise: int,
        currency: str,
        razorpay_order_id: str,
        customer: dict,
    ) -> PaymentRecord:
        record = PaymentRecord(
            plan_id=plan_id,
            plan_name=plan_name,
            amount_paise=amount_paise,
            currency=currency,
            razorpay_order_id=razorpay_order_id,
            customer=customer,
            status="created",
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def get_by_order_id(self, razorpay_order_id: str) -> PaymentRecord | None:
        return self.db.query(PaymentRecord).filter(
            PaymentRecord.razorpay_order_id == razorpay_order_id
        ).first()

    def mark_verified(
        self,
        record: PaymentRecord,
        *,
        razorpay_payment_id: str,
        razorpay_signature: str,
    ) -> PaymentRecord:
        record.status = "verified"
        record.razorpay_payment_id = razorpay_payment_id
        record.razorpay_signature = razorpay_signature
        record.verified_at = utcnow()
        self.db.commit()
        self.db.refresh(record)
        return record

    def create_pricing_lead(
        self,
        *,
        name: str,
        email: str,
        company: str,
        expected_call_volume: str,
        plan_id: str = "custom",
    ) -> PricingLeadCapture:
        lead = PricingLeadCapture(
            name=name,
            email=email,
            company=company,
            expected_call_volume=expected_call_volume,
            plan_id=plan_id,
        )
        self.db.add(lead)
        self.db.commit()
        self.db.refresh(lead)
        return lead

