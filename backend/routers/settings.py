"""Settings endpoints (currently scoped to the calling engine)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from deps import get_current_user, require_roles
from models import User
from schemas import CallingSettings, CallingSettingsUpdate
from services import campaign_engine, campaign_dialer

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/calling", response_model=CallingSettings)
def get_calling(db: Session = Depends(get_db),
                _: User = Depends(get_current_user)):
    return campaign_engine.get_calling_settings(db)


@router.put("/calling", response_model=CallingSettings)
def update_calling(body: CallingSettingsUpdate,
                   db: Session = Depends(get_db),
                   _: User = Depends(require_roles("Admin", "Manager"))):
    return campaign_engine.save_calling_settings(db, body.model_dump(exclude_unset=True))


@router.get("/calling/provider")
def calling_provider(_: User = Depends(get_current_user)):
    return {"provider": campaign_dialer.provider_name(),
            "outcomes": campaign_dialer.OUTCOMES}
