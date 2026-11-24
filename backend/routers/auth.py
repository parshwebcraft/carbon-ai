import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import jwt

from database import get_db
from models import User, Company, CompanyUser, uuid_str
from schemas import LoginIn, TokenOut, UserOut, RefreshIn, UserCreate
from auth_utils import (
    verify_password, create_access_token, create_refresh_token, decode_token, hash_password,
)
from deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


def _enrich_user_out(user: User, db: Session) -> UserOut:
    out = UserOut.model_validate(user)
    if user.company_id:
        comp = db.query(Company).filter(Company.id == user.company_id).first()
        if comp:
            out.company_id = comp.id
            out.company_name = comp.name
            out.subscription_status = comp.subscription_status
            out.onboarding_completed = comp.onboarding_completed
            out.onboarding_step = comp.onboarding_step
            return out

    # If user doesn't have company_id, check CompanyUser or create/link default
    cu = db.query(CompanyUser).filter(CompanyUser.legacy_user_id == user.id).first()
    if cu:
        comp = db.query(Company).filter(Company.id == cu.company_id).first()
        if comp:
            user.company_id = comp.id
            db.commit()
            out.company_id = comp.id
            out.company_name = comp.name
            out.subscription_status = comp.subscription_status
            out.onboarding_completed = comp.onboarding_completed
            out.onboarding_step = comp.onboarding_step
            return out

    # Fallback for primary admin
    if user.email in ("admin@parshagent.com", "admin@parshwebcraft.com"):
        comp = db.query(Company).filter(Company.slug == "parshwebcraft").first()
        if not comp:
            comp = Company(
                id="parshwebcraft-default",
                name="ParshWebCraft",
                slug="parshwebcraft",
                brand_name="ParshWebCraft",
                status="active",
                subscription_status="active",
                onboarding_completed=True,
                onboarding_step="completed",
            )
            db.add(comp)
            db.commit()
            db.refresh(comp)
        user.company_id = comp.id
        db.commit()
        out.company_id = comp.id
        out.company_name = comp.name
        out.subscription_status = "active"
        out.onboarding_completed = True
        out.onboarding_step = "completed"
    else:
        # Create a company for legacy user
        comp = Company(
            name=f"{user.name}'s Workspace",
            slug=f"user-{user.id}-{uuid_str()[:6]}",
            status="active",
            subscription_status="trialing",
            onboarding_completed=False,
            onboarding_step="profile",
        )
        db.add(comp)
        db.commit()
        db.refresh(comp)
        user.company_id = comp.id
        db.commit()
        out.company_id = comp.id
        out.company_name = comp.name
        out.subscription_status = comp.subscription_status
        out.onboarding_completed = comp.onboarding_completed
        out.onboarding_step = comp.onboarding_step

    return out


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is inactive")
    return TokenOut(
        access_token=create_access_token(user.id, user.email, user.role),
        refresh_token=create_refresh_token(user.id),
        user=_enrich_user_out(user, db),
    )


@router.post("/refresh")
def refresh(payload: RefreshIn, db: Session = Depends(get_db)):
    try:
        data = decode_token(payload.refresh_token)
        if data.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = int(data["sub"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return {"access_token": create_access_token(user.id, user.email, user.role)}


@router.get("/me", response_model=UserOut)
def me(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _enrich_user_out(current, db)


@router.post("/logout")
def logout(current: User = Depends(get_current_user)):
    # JWT is stateless; clients drop the token.
    return {"ok": True}


@router.post("/register", response_model=TokenOut, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # 1. Create a dedicated isolated Company for this new customer!
    comp_name = (payload.company_name or f"{payload.name}'s Workspace").strip()
    base_slug = re.sub(r"[^a-z0-9]+", "-", comp_name.lower()).strip("-") or "company"
    unique_slug = f"{base_slug}-{uuid_str()[:6]}"
    
    company = Company(
        name=comp_name,
        slug=unique_slug,
        brand_name=comp_name,
        phone=payload.phone,
        status="active",
        plan_name="starter",
        subscription_status="trialing",
        onboarding_completed=False,
        onboarding_step="profile",
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    # 2. Create the User linked to this company as Admin
    user = User(
        name=payload.name,
        email=email,
        phone=payload.phone,
        company_id=company.id,
        role="Admin",
        is_active=True,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 3. Create CompanyUser linking
    comp_user = CompanyUser(
        company_id=company.id,
        legacy_user_id=user.id,
        role="Admin",
        is_active=True,
    )
    db.add(comp_user)
    db.commit()

    return TokenOut(
        access_token=create_access_token(user.id, user.email, user.role),
        refresh_token=create_refresh_token(user.id),
        user=_enrich_user_out(user, db),
    )
