import os
from typing import Optional
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VoiceGrant

class TwilioNotConfigured(RuntimeError):
    pass

def get_account_sid() -> str:
    sid = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
    if not sid:
        raise TwilioNotConfigured("TWILIO_ACCOUNT_SID is not set in backend/.env")
    return sid

def get_api_key_sid() -> str:
    key = os.environ.get("TWILIO_API_KEY", "").strip()
    if not key:
        raise TwilioNotConfigured("TWILIO_API_KEY is not set in backend/.env. Create one in your Twilio Console under Settings > API Keys.")
    return key

def get_api_key_secret() -> str:
    secret = os.environ.get("TWILIO_API_SECRET", "").strip()
    if not secret:
        raise TwilioNotConfigured("TWILIO_API_SECRET is not set in backend/.env")
    return secret

def get_twiml_app_sid() -> str:
    app_sid = os.environ.get("TWILIO_TWIML_APP_SID", "").strip()
    if not app_sid:
        raise TwilioNotConfigured("TWILIO_TWIML_APP_SID is not set in backend/.env. Create a TwiML App in Twilio Console to route outbound calls.")
    return app_sid

def is_configured() -> bool:
    try:
        return bool(get_account_sid() and get_api_key_sid() and get_api_key_secret() and get_twiml_app_sid())
    except TwilioNotConfigured:
        return False

def generate_voice_token(identity: str) -> str:
    """Generate a Twilio WebRTC Voice Access Token for a browser client identity."""
    account_sid = get_account_sid()
    api_key_sid = get_api_key_sid()
    api_key_secret = get_api_key_secret()
    app_sid = get_twiml_app_sid()

    token = AccessToken(
        account_sid,
        api_key_sid,
        api_key_secret,
        identity=identity,
        ttl=28800  # Token valid for 8 hours (matching CRM session)
    )

    # Allow outgoing calls via TwiML App and incoming calls
    grant = VoiceGrant(
        outgoing_application_sid=app_sid,
        incoming_allow=True
    )
    token.add_grant(grant)
    return token.to_jwt()
