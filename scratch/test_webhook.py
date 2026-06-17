import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

# Load local .env
from dotenv import load_dotenv
load_dotenv(backend_dir / ".env")

# Import local modules
from database import SessionLocal
from models import Campaign, CampaignTarget, Lead
from fastapi.testclient import TestClient
from server import app

def test_vapi_webhook():
    db = SessionLocal()
    client = TestClient(app)

    try:
        # 1. Create a dummy Lead
        lead = Lead(
            name="Test Webhook Lead",
            phone="+1234567890",
            status="New",
            source="Website"
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)

        # 2. Create a dummy Campaign
        campaign = Campaign(
            name="Test Webhook Campaign",
            status="running",
            campaign_prompt="Hello, this is a test prompt."
        )
        db.add(campaign)
        db.commit()
        db.refresh(campaign)

        # 3. Create a dummy CampaignTarget
        tgt = CampaignTarget(
            campaign_id=campaign.id,
            lead_id=lead.id,
            name="Test Webhook Lead",
            phone="+1234567890",
            vapi_call_id="vapi-test-call-unique-12345",
            call_status="dialing"
        )
        db.add(tgt)
        db.commit()
        db.refresh(tgt)

        # 4. Trigger Webhook
        payload = {
            "message": {
                "type": "end-of-call-report",
                "call": {
                    "id": "vapi-test-call-unique-12345"
                },
                "durationSeconds": 75,
                "transcript": "Hello, I would like to visit the showroom and book an appointment.",
                "summary": "Customer booked an appointment for showroom.",
                "analysis": {
                    "sentiment": "Positive",
                    "leadScore": 95,
                    "successEvaluation": "Appointment Booked"
                },
                "recordingUrl": "https://example.com/recording_test.mp3",
                "cost": 0.25
            }
        }

        response = client.post("/api/voice/webhook", json=payload)
        print("Webhook Response:", response.status_code, response.json())
        assert response.status_code == 200

        # Refresh objects
        db.refresh(tgt)
        db.refresh(lead)

        # 5. Assertions
        print("Target Status:", tgt.call_status)
        print("Target Duration:", tgt.duration)
        print("Target Outcome:", tgt.outcome)
        print("Target Sentiment:", tgt.sentiment)
        print("Target Lead Score:", tgt.lead_score)
        print("Lead Status:", lead.status)

        assert tgt.call_status == "completed"
        assert tgt.duration == 75
        assert tgt.outcome == "Appointment Booked"
        assert tgt.sentiment == "Positive"
        assert tgt.lead_score == 95
        assert lead.status == "Visit Scheduled"  # Appointment Booked maps to Visit Scheduled

        print("Webhook end-to-call report integration test passed successfully!")

    finally:
        # Clean up
        db.query(CampaignTarget).filter(CampaignTarget.vapi_call_id == "vapi-test-call-unique-12345").delete()
        db.query(Campaign).filter(Campaign.name == "Test Webhook Campaign").delete()
        db.query(Lead).filter(Lead.name == "Test Webhook Lead").delete()
        db.commit()
        db.close()

if __name__ == "__main__":
    test_vapi_webhook()
