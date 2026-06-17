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
)
from services import scheduler as scheduler_service
from services import campaign_engine

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("facets")

app = FastAPI(title="Facets Jewellery CRM", version="1.1.0")
api = APIRouter(prefix="/api")


@api.get("/")
def root():
    return {"app": "Facets Jewellery CRM", "status": "ok"}


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
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_call_columns()
    _ensure_admin_seed()
    if scheduler_service.followups_enabled():
        loop = asyncio.get_event_loop()
        loop.create_task(scheduler_service.loop())
    # Campaign engine — always-on; idle when no campaigns are running
    loop = asyncio.get_event_loop()
    loop.create_task(campaign_engine.loop())
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
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@facetscrm.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "password123")
    db = SessionLocal()
    try:
        existing = db.query(models.User).filter(models.User.email == admin_email).first()
        if existing is None:
            db.add(models.User(
                name="Facets Admin", email=admin_email,
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
