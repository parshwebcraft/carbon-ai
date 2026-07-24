"""Facets Lifestyle Jewellery CRM - FastAPI entry point."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import asyncio
import logging
import os
from fastapi import FastAPI, APIRouter
from sqlalchemy import inspect, text
from starlette.middleware.cors import CORSMiddleware

from database import engine, SessionLocal, Base
import models  # noqa: F401 - register models on Base
from auth_utils import hash_password, verify_password

from routers import (
    auth as auth_router,
    leads as leads_router,
    tasks as tasks_router,
    calls as calls_router,
    whatsapp_webhook as whatsapp_ext_router,
    whatsapp as whatsapp_router,
    activities as activities_router,
    products as products_router,
    appointments as appointments_router,
    quotations as quotations_router,
    ai_logs as ai_logs_router,
    notifications as notifications_router,
    users as users_router,
    dashboard as dashboard_router,
    ai as ai_router,
    voice as voice_router,
    settings as settings_router,
    campaigns as campaigns_router,
    copilot as copilot_router,
    voice_ai as voice_ai_router,
    voice_dialer as voice_dialer_router,
    automation as automation_router,
    foundation as foundation_router,
    payments as payments_router,
)
from services import scheduler as scheduler_service
from services import campaign_engine

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("facets")

app = FastAPI(title="ParshWebCraft CRM", version="1.2.0")
api = APIRouter(prefix="/api")


@api.get("/")
def root():
    return {"app": "ParshWebCraft CRM", "status": "ok"}


@api.get("/health")
def health():
    try:
        with engine.connect() as c:
            c.exec_driver_sql("SELECT 1")
        return {"status": "ok", "db": "ok"}
    except Exception as e:  # noqa: BLE001
        return {"status": "degraded", "db": str(e)}


api.include_router(auth_router.router)
api.include_router(users_router.router)
api.include_router(leads_router.router)
api.include_router(activities_router.router)
api.include_router(tasks_router.router)
api.include_router(calls_router.router)
# IMPORTANT: register whatsapp_webhook BEFORE the generic whatsapp router so
# /api/whatsapp/webhook is matched before /api/whatsapp/{lead_id}.
api.include_router(whatsapp_ext_router.router)
api.include_router(whatsapp_router.router)
api.include_router(products_router.router)
api.include_router(appointments_router.router)
api.include_router(quotations_router.router)
api.include_router(ai_logs_router.router)
api.include_router(notifications_router.router)
api.include_router(dashboard_router.router)
api.include_router(ai_router.router)
api.include_router(voice_router.router)
api.include_router(settings_router.router)
api.include_router(campaigns_router.router)
api.include_router(copilot_router.router)
api.include_router(voice_ai_router.router)
api.include_router(voice_dialer_router.router)
api.include_router(automation_router.router)
api.include_router(foundation_router.router)
api.include_router(payments_router.router)

app.include_router(api)

cors_origins = os.environ.get("CORS_ORIGINS", "*").split(",")
if "*" in cors_origins:
    cors_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins,
    allow_origin_regex="https://.*\\.vercel\\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)


async def keep_alive_loop() -> None:
    """Self-ping loop to prevent Render free tier instance from spinning down."""
    import httpx
    # Wait 30 seconds for server startup to complete
    await asyncio.sleep(30)
    
    self_url = os.environ.get("SELF_PUBLIC_URL", "https://carbon-ai-dsom.onrender.com").strip()
    if not self_url.endswith("/api/health"):
        self_url = self_url.rstrip("/") + "/api/health"
        
    logger.info("Keep-alive loop running. Target URL: %s", self_url)
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        while True:
            try:
                res = await client.get(self_url)
                logger.info("Keep-alive ping response: %s", res.status_code)
            except Exception as e:
                logger.warning("Keep-alive self-ping failed: %s", e)
            # Sleep for 3 minutes (180 seconds)
            await asyncio.sleep(180)


async def task_overdue_checker_loop() -> None:
    """Periodically checks for overdue tasks and triggers automations."""
    import gc
    from datetime import datetime, timezone
    from database import SessionLocal
    from models import Task
    from services.automation_engine import trigger_automation
    
    triggered_tasks = set()
    await asyncio.sleep(60) # Wait 1 minute on boot
    
    while True:
        db = SessionLocal()
        try:
            now = datetime.now(timezone.utc)
            overdue = db.query(Task).filter(
                Task.status.in_(["Open", "In Progress"]),
                Task.due_date < now
            ).all()
            
            for t in overdue:
                if t.id not in triggered_tasks:
                    logger.info("Task %s is overdue! Triggering automation...", t.id)
                    trigger_automation(db, "task_overdue", t.id)
                    triggered_tasks.add(t.id)
        except Exception as e:
            logger.exception("Error checking overdue tasks: %s", e)
        finally:
            db.close()
            gc.collect()
        # Check every 5 minutes (300 seconds)
        await asyncio.sleep(300)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_call_columns()
    _ensure_admin_seed()
    _ensure_parshcall_foundation_seed()
    if scheduler_service.followups_enabled():
        loop = asyncio.get_event_loop()
        loop.create_task(scheduler_service.loop())
    # Campaign engine — always-on; idle when no campaigns are running
    loop = asyncio.get_event_loop()
    loop.create_task(campaign_engine.loop())
    
    # Launch Keep-alive self-pinger
    loop.create_task(keep_alive_loop())
    
    # Launch Task overdue checker
    loop.create_task(task_overdue_checker_loop())
    
    logger.info("Facets CRM ready")


def _ensure_call_columns() -> None:
    """Idempotent: add new optional columns to calls table without dropping data."""
    insp = inspect(engine)
    if "calls" not in insp.get_table_names():
        return
    existing = {c["name"] for c in insp.get_columns("calls")}
    add = []
    if "transcript" not in existing:
        add.append("ALTER TABLE calls ADD COLUMN transcript TEXT")
    if "sentiment" not in existing:
        add.append("ALTER TABLE calls ADD COLUMN sentiment VARCHAR(20)")
    if "vapi_call_id" not in existing:
        add.append("ALTER TABLE calls ADD COLUMN vapi_call_id VARCHAR(80)")
    if not add:
        return
    with engine.begin() as conn:
        for stmt in add:
            conn.execute(text(stmt))
    logger.info("calls table migrated: %s", add)


def _ensure_admin_seed() -> None:
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@parshwebcraft.in").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "password123")
    db = SessionLocal()
    try:
        existing = db.query(models.User).filter(models.User.email == admin_email).first()
        if existing is None:
            db.add(models.User(
                name="ParshWebCraft Admin", email=admin_email,
                password_hash=hash_password(admin_password),
                role="Admin", is_active=True,
            ))
            db.commit()
            logger.info("Seeded default admin %s", admin_email)
        elif not verify_password(admin_password, existing.password_hash):
            existing.password_hash = hash_password(admin_password)
            db.commit()
            logger.info("Refreshed admin password for %s", admin_email)
    finally:
        db.close()


def _ensure_parshcall_foundation_seed() -> None:
    """Seed the default tenant for local development without touching CRM data."""
    default_slug = os.environ.get("DEFAULT_COMPANY_SLUG", "parshwebcraft").strip() or "parshwebcraft"
    db = SessionLocal()
    try:
        company = db.query(models.Company).filter(models.Company.slug == default_slug).first()
        if not company:
            company = models.Company(
                name="ParshWebCraft",
                slug=default_slug,
                brand_name="ParshWebCraft",
                website="https://parshwebcraft.com",
            )
            db.add(company)
            db.flush()

        if not db.query(models.BusinessProfile).filter(models.BusinessProfile.company_id == company.id).first():
            db.add(models.BusinessProfile(
                company_id=company.id,
                about_company=(
                    "ParshWebCraft is a web and software digital agency focused on websites, "
                    "ecommerce, SEO, digital marketing, hosting, branding, and business automation."
                ),
                mission="Help businesses grow with practical digital products and AI-enabled workflows.",
                vision="Become a trusted digital transformation partner for service businesses and growing brands.",
                services=[
                    "Website Development",
                    "Ecommerce",
                    "SEO",
                    "Digital Marketing",
                    "Hosting",
                    "Branding",
                    "Automation",
                ],
                usp="Full-stack web, CRM, automation, and AI calling solutions from one partner.",
                website="https://parshwebcraft.com",
                industries_served=[
                    "Local Businesses",
                    "Service Companies",
                    "Retail",
                    "Education",
                    "Healthcare",
                    "Real Estate",
                    "Agencies",
                ],
                languages=["English", "Hindi"],
                working_process="Discovery, proposal, design, development, review, launch, and ongoing support.",
                payment_terms="Project terms are confirmed in the proposal. Milestone payments may apply.",
                support_hours="Business-hours support with priority support for active retainers.",
            ))

        admin = db.query(models.User).filter(models.User.email == os.environ.get("ADMIN_EMAIL", "admin@parshwebcraft.in").lower()).first()
        if admin and not db.query(models.CompanyUser).filter(
            models.CompanyUser.company_id == company.id,
            models.CompanyUser.legacy_user_id == admin.id,
        ).first():
            db.add(models.CompanyUser(
                company_id=company.id,
                legacy_user_id=admin.id,
                role="Admin",
                is_active=True,
            ))
        db.commit()
    except Exception as e:  # noqa: BLE001
        db.rollback()
        logger.warning("ParshCall foundation seed skipped: %s", e)
    finally:
        db.close()
