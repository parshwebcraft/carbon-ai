"""ParshCall AI foundation status endpoints."""
from fastapi import APIRouter

from services.supabase_config import get_supabase_settings

router = APIRouter(prefix="/foundation", tags=["foundation"])


@router.get("/status")
def foundation_status():
    settings = get_supabase_settings()
    return {
        "default_company_slug": settings.default_company_slug,
        "supabase_configured": settings.configured,
        "storage_buckets": {
            "knowledge_base": settings.knowledge_bucket,
            "call_recordings": settings.call_recordings_bucket,
            "training_artifacts": settings.training_artifacts_bucket,
        },
        "auth_mode": "legacy_jwt_active_supabase_parallel",
        "modules": {
            "knowledge_base": "planned",
            "business_profile": "planned",
            "ai_training_center": "planned",
            "sales_playbook": "planned",
            "objection_library": "planned",
            "ai_calling_intelligence": "planned",
        },
    }

