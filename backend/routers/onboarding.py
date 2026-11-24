"""Customer Onboarding Wizard router for Multi-Tenant setup."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, Company, BusinessProfile, Setting
from deps import get_current_user

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


class ProfileSetupIn(BaseModel):
    company_name: str
    industry: Optional[str] = "Digital Marketing & Web Services"
    website: Optional[str] = None
    phone: Optional[str] = None


class PlanSelectIn(BaseModel):
    plan_id: str = "starter"
    payment_id: Optional[str] = None
    order_id: Optional[str] = None


class VoiceAgentSetupIn(BaseModel):
    agent_name: str = "Priya - AI Sales Specialist"
    language: str = "Hinglish"
    business_pitch: Optional[str] = None
    caller_id: Optional[str] = None


@router.get("/status")
def get_onboarding_status(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    comp = db.query(Company).filter(Company.id == user.company_id).first() if user.company_id else None
    if not comp:
        return {
            "onboarding_completed": False,
            "onboarding_step": "profile",
            "company_name": f"{user.name}'s Workspace",
            "subscription_status": "trialing",
            "plan_name": "starter",
        }
    return {
        "onboarding_completed": comp.onboarding_completed,
        "onboarding_step": comp.onboarding_step or "profile",
        "company_id": comp.id,
        "company_name": comp.name,
        "industry": comp.industry,
        "website": comp.website,
        "phone": comp.phone or user.phone,
        "plan_name": comp.plan_name or "starter",
        "subscription_status": comp.subscription_status or "trialing",
        "voice_agent_name": comp.voice_agent_name or "Priya - AI Sales Specialist",
        "voice_language": comp.voice_language or "Hinglish",
        "voice_pitch": comp.voice_pitch or "",
    }


@router.post("/profile")
def save_profile(
    payload: ProfileSetupIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if not user.company_id:
        raise HTTPException(400, "No company associated with user")
    comp = db.query(Company).filter(Company.id == user.company_id).first()
    if not comp:
        raise HTTPException(404, "Company not found")

    comp.name = payload.company_name.strip()
    comp.brand_name = payload.company_name.strip()
    if payload.industry:
        comp.industry = payload.industry.strip()
    if payload.website:
        comp.website = payload.website.strip()
    if payload.phone:
        comp.phone = payload.phone.strip()

    # Move to next step
    if not comp.onboarding_completed:
        comp.onboarding_step = "subscription"

    # Also update or create BusinessProfile
    bp = db.query(BusinessProfile).filter(BusinessProfile.company_id == comp.id).first()
    if not bp:
        bp = BusinessProfile(
            company_id=comp.id,
            about_company=f"{comp.name} provides high-quality {comp.industry} solutions.",
            website=comp.website or "",
        )
        db.add(bp)
    else:
        bp.website = comp.website or bp.website

    db.commit()
    return {"status": "ok", "next_step": comp.onboarding_step}


@router.post("/plan")
def select_plan(
    payload: PlanSelectIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if not user.company_id:
        raise HTTPException(400, "No company associated with user")
    comp = db.query(Company).filter(Company.id == user.company_id).first()
    if not comp:
        raise HTTPException(404, "Company not found")

    comp.plan_name = payload.plan_id
    comp.subscription_status = "active"
    if payload.payment_id:
        comp.razorpay_payment_id = payload.payment_id
    if payload.order_id:
        comp.razorpay_order_id = payload.order_id

    if not comp.onboarding_completed:
        comp.onboarding_step = "voice_agent"

    db.commit()
    return {"status": "ok", "next_step": comp.onboarding_step}


@router.post("/voice-agent")
def setup_voice_agent(
    payload: VoiceAgentSetupIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if not user.company_id:
        raise HTTPException(400, "No company associated with user")
    comp = db.query(Company).filter(Company.id == user.company_id).first()
    if not comp:
        raise HTTPException(404, "Company not found")

    comp.voice_agent_name = payload.agent_name.strip()
    comp.voice_language = payload.language.strip()
    if payload.business_pitch:
        comp.voice_pitch = payload.business_pitch.strip()
    if payload.caller_id:
        comp.voice_caller_id = payload.caller_id.strip()

    # Complete onboarding
    comp.onboarding_completed = True
    comp.onboarding_step = "completed"
    db.commit()

    return {"status": "ok", "completed": True, "message": "Onboarding completed successfully!"}
