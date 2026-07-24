"""Public pricing payment endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from repositories.payments import PaymentRepository
from schemas import (
    PaymentCreateOrderIn,
    PaymentCreateOrderOut,
    PaymentVerifyIn,
    PaymentVerifyOut,
    PricingLeadCaptureIn,
    PricingLeadCaptureOut,
)
from services.payments import PaymentService

router = APIRouter(prefix="/payments", tags=["payments"])


def get_payment_service(db: Session = Depends(get_db)) -> PaymentService:
    return PaymentService(PaymentRepository(db))


@router.post("/create-order", response_model=PaymentCreateOrderOut)
def create_order(payload: PaymentCreateOrderIn, service: PaymentService = Depends(get_payment_service)):
    return service.create_order(payload.plan_id, customer=payload.customer or {})


@router.post("/verify", response_model=PaymentVerifyOut)
def verify_payment(payload: PaymentVerifyIn, service: PaymentService = Depends(get_payment_service)):
    return service.verify_payment(
        order_id=payload.razorpay_order_id,
        payment_id=payload.razorpay_payment_id,
        signature=payload.razorpay_signature,
    )


@router.post("/contact-sales", response_model=PricingLeadCaptureOut, status_code=201)
def contact_sales(payload: PricingLeadCaptureIn, service: PaymentService = Depends(get_payment_service)):
    return service.capture_pricing_lead(**payload.model_dump())

