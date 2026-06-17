import os
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from database import get_db
from deps import get_current_user
from models import User
from services import twilio_voice

router = APIRouter(prefix="/voice-dialer", tags=["voice-dialer"])

@router.get("/token")
def get_twilio_token(
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user)
):
    """Generate a Twilio WebRTC token for the logged-in user."""
    try:
        identity = f"user_{me.id}_{me.email.replace('@', '_').replace('.', '_')}"
        token = twilio_voice.generate_voice_token(identity)
        return {"token": token, "identity": identity}
    except twilio_voice.TwilioNotConfigured as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        raise HTTPException(500, f"Failed to generate Twilio token: {e}")

@router.post("/call-twiml")
async def call_twiml(request: Request):
    """Webhook for Twilio to fetch call routing instructions (TwiML)."""
    form_data = await request.form()
    to_number = form_data.get("to")
    
    # Use TWILIO_PHONE_NUMBER or fallback to a custom setting
    caller_id = os.environ.get("TWILIO_PHONE_NUMBER", "").strip()
    
    if not to_number:
        # If no destination specified, reject
        return Response(content="<Response><Reject/></Response>", media_type="application/xml")
        
    # Standard E.164 phone dialing
    dial_attr = f' callerId="{caller_id}"' if caller_id else ''
    twiml = (
        f'<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<Response>\n'
        f'    <Dial{dial_attr}>\n'
        f'        <Number>{to_number}</Number>\n'
        f'    </Dial>\n'
        f'</Response>'
    )
    return Response(content=twiml, media_type="application/xml")
