"""
Database migration script to add multi-tenant columns and initialize default company.
Safe to run multiple times (idempotent).
"""
import sys
import logging
from sqlalchemy import text
from database import engine, Base, SessionLocal
import models

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

def migrate():
    logger.info("Step 1: Running Base.metadata.create_all to ensure all tables exist...")
    Base.metadata.create_all(bind=engine)

    # Columns to add if missing: (table, column, type_def)
    columns_to_ensure = [
        # users
        ("users", "company_id", "VARCHAR(36)"),
        ("users", "phone", "VARCHAR(32)"),

        # companies
        ("companies", "brand_name", "VARCHAR(160)"),
        ("companies", "website", "VARCHAR(255)"),
        ("companies", "industry", "VARCHAR(120) DEFAULT 'Technology & Services'"),
        ("companies", "phone", "VARCHAR(32)"),
        ("companies", "status", "VARCHAR(30) DEFAULT 'active'"),
        ("companies", "plan_name", "VARCHAR(80) DEFAULT 'starter'"),
        ("companies", "subscription_status", "VARCHAR(40) DEFAULT 'trialing'"),
        ("companies", "subscription_amount", "DOUBLE PRECISION DEFAULT 9999.0"),
        ("companies", "subscription_currency", "VARCHAR(10) DEFAULT 'INR'"),
        ("companies", "razorpay_order_id", "VARCHAR(120)"),
        ("companies", "razorpay_payment_id", "VARCHAR(120)"),
        ("companies", "razorpay_subscription_id", "VARCHAR(120)"),
        ("companies", "trial_ends_at", "TIMESTAMP WITHOUT TIME ZONE"),
        ("companies", "onboarding_completed", "BOOLEAN DEFAULT FALSE"),
        ("companies", "onboarding_step", "VARCHAR(50) DEFAULT 'profile'"),
        ("companies", "voice_agent_name", "VARCHAR(120) DEFAULT 'Priya - AI Sales Specialist'"),
        ("companies", "voice_language", "VARCHAR(40) DEFAULT 'Hinglish'"),
        ("companies", "voice_pitch", "TEXT"),
        ("companies", "voice_caller_id", "VARCHAR(40)"),

        # leads & child entities
        ("leads", "company_id", "VARCHAR(36)"),
        ("leads", "ai_bot_paused", "BOOLEAN DEFAULT FALSE"),
        ("leads", "ai_bot_handover_reason", "VARCHAR(255)"),
        ("activities", "company_id", "VARCHAR(36)"),
        ("calls", "company_id", "VARCHAR(36)"),
        ("tasks", "company_id", "VARCHAR(36)"),
        ("whatsapp_messages", "company_id", "VARCHAR(36)"),
        ("appointments", "company_id", "VARCHAR(36)"),
        ("quotations", "company_id", "VARCHAR(36)"),
        ("ai_agent_logs", "company_id", "VARCHAR(36)"),
        ("settings", "company_id", "VARCHAR(36)"),
        ("campaigns", "company_id", "VARCHAR(36)"),
        ("whatsapp_accounts", "company_id", "VARCHAR(36)"),
        ("payments", "company_id", "VARCHAR(36)"),
        ("integrations", "company_id", "VARCHAR(36)"),
        ("ai_agent_configs", "company_id", "VARCHAR(36)"),
        ("payment_link_records", "company_id", "VARCHAR(36)"),
        ("meta_template_records", "company_id", "VARCHAR(36)")
    ]

    logger.info("Step 2: Checking and applying column alterations...")
    from sqlalchemy import inspect
    inspector = inspect(engine)
    
    with engine.connect() as conn:
        for table, col, col_type in columns_to_ensure:
            try:
                existing_cols = [c["name"] for c in inspector.get_columns(table)]
                if col not in existing_cols:
                    logger.info(f"Adding column '{col}' to table '{table}' ({col_type})...")
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type};"))
                    conn.commit()
                    # Refresh inspector cache
                    inspector = inspect(engine)
                else:
                    logger.debug(f"Column '{col}' already exists in '{table}'.")
            except Exception as e:
                logger.warning(f"Error checking/adding column {col} to {table}: {e}")

    logger.info("Step 3: Initializing default company and backfilling legacy records...")
    db = SessionLocal()
    try:
        # 1. Ensure default ParshWebCraft company
        default_company = db.query(models.Company).filter(
            (models.Company.id == "parshwebcraft-default") | (models.Company.slug == "parshwebcraft")
        ).first()
        if not default_company:
            default_company = models.Company(
                id="parshwebcraft-default",
                name="ParshWebCraft",
                slug="parshwebcraft",
                brand_name="ParshWebCraft",
                website="https://parshwebcraft.com",
                industry="Agency & Software Solutions",
                phone="918442097839",
                status="active",
                plan_name="enterprise",
                subscription_status="active",
                subscription_amount=9999.0,
                onboarding_completed=True,
                onboarding_step="completed",
                voice_agent_name="Priya - ParshWebCraft AI",
                voice_language="Hinglish",
                voice_pitch="Namaste! Main Priya baat kar rahi hoon ParshWebCraft se."
            )
            db.add(default_company)
            db.commit()
            db.refresh(default_company)
            logger.info("Created default company 'parshwebcraft-default'.")
        else:
            default_company.onboarding_completed = True
            default_company.subscription_status = "active"
            default_company.onboarding_step = "completed"
            db.commit()
            logger.info(f"Default company '{default_company.name}' ({default_company.id}) is up to date.")

        # 2. Attach legacy admin users to default company
        admins = db.query(models.User).filter(
            models.User.email.in_(["admin@parshwebcraft.com", "admin@parshagent.com"])
        ).all()
        for admin in admins:
            admin.company_id = default_company.id
            logger.info(f"Attached admin user {admin.email} to default company {default_company.id}.")


        
        # Also assign any user without company_id to default company if it's the only one
        users_without_company = db.query(models.User).filter(models.User.company_id.is_(None)).all()
        for u in users_without_company:
            u.company_id = default_company.id
            logger.info(f"Assigned user {u.email} to default company.")

        db.commit()

        # 3. Backfill company_id for all legacy records
        tables_to_backfill = [
            (models.Lead, "Lead"),
            (models.Activity, "Activity"),
            (models.Call, "Call"),
            (models.Task, "Task"),
            (models.WhatsappMessage, "WhatsappMessage"),
            (models.Appointment, "Appointment"),
            (models.Quotation, "Quotation"),
            (models.AIAgentLog, "AIAgentLog"),
            (models.Campaign, "Campaign"),
            (models.WhatsAppAccount, "WhatsAppAccount"),
            (models.Integration, "Integration"),
            (models.AiAgentConfig, "AiAgentConfig"),
            (models.PaymentLinkRecord, "PaymentLinkRecord"),
            (models.MetaTemplateRecord, "MetaTemplateRecord"),
        ]

        for model_cls, name in tables_to_backfill:
            try:
                updated = db.query(model_cls).filter(model_cls.company_id.is_(None)).update(
                    {"company_id": default_company.id},
                    synchronize_session=False
                )
                if updated:
                    logger.info(f"Backfilled {updated} {name} records to default company.")
            except Exception as e:
                logger.warning(f"Could not backfill {name}: {e}")

        db.commit()
        logger.info("Migration completed successfully!")

    except Exception as e:
        db.rollback()
        logger.error(f"Migration error: {e}", exc_info=True)
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
