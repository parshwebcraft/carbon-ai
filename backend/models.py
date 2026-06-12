"""SQLAlchemy ORM models for Facets Jewellery CRM."""
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, Float,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(160), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="Sales")  # Admin | Manager | Sales
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    leads = relationship("Lead", back_populates="assignee", foreign_keys="Lead.assigned_to")
    tasks = relationship("Task", back_populates="assignee", foreign_keys="Task.assigned_to")


class Lead(Base):
    __tablename__ = "leads"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(160), nullable=False)
    phone = Column(String(32))
    email = Column(String(160))
    company = Column(String(160))
    city = Column(String(80))
    source = Column(String(40))            # Website | WhatsApp | Instagram | Facebook | Walk-In | Referral | Google Ads
    status = Column(String(40), default="New")  # New | Contacted | Follow Up | Interested | Visit Scheduled | Quotation Sent | Negotiation | Won | Lost
    budget = Column(Float, default=0.0)
    customer_type = Column(String(40))     # Gold | Diamond | Bridal | Existing | High Value
    notes = Column(Text)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    assignee = relationship("User", back_populates="leads", foreign_keys=[assigned_to])
    activities = relationship("Activity", back_populates="lead", cascade="all, delete-orphan")
    calls = relationship("Call", back_populates="lead", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="lead", cascade="all, delete-orphan")
    whatsapp_messages = relationship("WhatsappMessage", back_populates="lead", cascade="all, delete-orphan")
    quotations = relationship("Quotation", back_populates="lead", cascade="all, delete-orphan")
    ai_logs = relationship("AIAgentLog", back_populates="lead", cascade="all, delete-orphan")


class Activity(Base):
    __tablename__ = "activities"
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    activity_type = Column(String(40), nullable=False)  # Note | Call | Email | Status Change | Meeting
    description = Column(Text, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    lead = relationship("Lead", back_populates="activities")


class Call(Base):
    __tablename__ = "calls"
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    call_duration = Column(Integer, default=0)  # seconds
    call_status = Column(String(40), default="Completed")  # Completed | Missed | No Answer | Voicemail | In Progress
    call_summary = Column(Text)
    transcript = Column(Text)
    sentiment = Column(String(20))
    vapi_call_id = Column(String(80), index=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    lead = relationship("Lead", back_populates="calls")


class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    priority = Column(String(20), default="Medium")  # Low | Medium | High
    status = Column(String(20), default="Open")      # Open | In Progress | Completed | Cancelled
    due_date = Column(DateTime)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    lead = relationship("Lead", back_populates="tasks")
    assignee = relationship("User", back_populates="tasks", foreign_keys=[assigned_to])


class WhatsappMessage(Base):
    __tablename__ = "whatsapp_messages"
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    direction = Column(String(10), nullable=False)  # in | out
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    lead = relationship("Lead", back_populates="whatsapp_messages")


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    product_name = Column(String(200), nullable=False)
    category = Column(String(80))      # Necklace | Ring | Earring | Bangle | Bridal Set | Pendant | Chain
    metal_type = Column(String(40))    # Gold | Diamond | Platinum | Silver
    purity = Column(String(20))        # 22K | 18K | 14K | VVS1 etc
    weight = Column(Float, default=0.0)
    making_charges = Column(Float, default=0.0)
    price = Column(Float, default=0.0)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String(160), nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    appointment_date = Column(DateTime, nullable=False)
    showroom_visit = Column(Boolean, default=True)
    notes = Column(Text)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class Quotation(Base):
    __tablename__ = "quotations"
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    quotation_number = Column(String(40), unique=True, nullable=False)
    amount = Column(Float, default=0.0)
    status = Column(String(30), default="Draft")  # Draft | Sent | Accepted | Rejected
    created_at = Column(DateTime, default=utcnow, nullable=False)

    lead = relationship("Lead", back_populates="quotations")


class AIAgentLog(Base):
    __tablename__ = "ai_agent_logs"
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    conversation_summary = Column(Text)
    sentiment = Column(String(20))     # Positive | Neutral | Negative
    next_action = Column(String(200))
    created_at = Column(DateTime, default=utcnow, nullable=False)

    lead = relationship("Lead", back_populates="ai_logs")


class Setting(Base):
    """Generic key/value JSON settings (singleton rows)."""
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(80), unique=True, index=True, nullable=False)
    value = Column(Text, nullable=False, default="{}")
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)


class Campaign(Base):
    """Outbound AI-calling campaign."""
    __tablename__ = "campaigns"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(160), nullable=False)
    description = Column(Text)
    # draft | running | paused | completed | cancelled
    status = Column(String(20), default="draft", nullable=False, index=True)

    campaign_prompt = Column(Text)  # static fallback script
    source_type = Column(String(20), default="leads")  # leads | csv | mixed
    filters_json = Column(Text, default="{}")          # serialised filter spec

    # Pacing overrides (null => use Setting.calling defaults)
    daily_call_limit = Column(Integer)
    start_time = Column(String(5))   # "10:00" 24h IST
    end_time = Column(String(5))     # "18:00"
    calls_per_minute = Column(Integer)

    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=utcnow, nullable=False)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    targets = relationship("CampaignTarget", back_populates="campaign", cascade="all, delete-orphan")


class CampaignTarget(Base):
    """One queued/processed call within a campaign."""
    __tablename__ = "campaign_targets"
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True, index=True)

    name = Column(String(160), nullable=False)
    phone = Column(String(32), nullable=False, index=True)
    city = Column(String(80))
    notes = Column(Text)
    source = Column(String(40))

    # Per-lead AI override that takes precedence over campaign_prompt
    lead_prompt_override = Column(Text)

    # pending|queued|dialing|ringing|connected|completed|failed|busy|no_answer
    call_status = Column(String(20), default="pending", nullable=False, index=True)
    attempts = Column(Integer, default=0, nullable=False)
    last_attempt_at = Column(DateTime)

    # Outcome (Jewellery-specific taxonomy)
    outcome = Column(String(40), index=True)
    duration = Column(Integer, default=0)
    transcript = Column(Text)
    summary = Column(Text)
    sentiment = Column(String(20))             # Positive | Neutral | Negative
    lead_score = Column(Integer)               # 0..100
    next_action = Column(String(200))
    recording_url = Column(String(500))
    call_cost = Column(Float, default=0.0)

    vapi_call_id = Column(String(80), index=True)  # populated when real provider is used

    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    campaign = relationship("Campaign", back_populates="targets")
