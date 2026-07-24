"""SQLAlchemy ORM models for Facets Jewellery CRM."""
from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, Float, JSON,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from database import Base


def utcnow():
    return datetime.now(timezone.utc)


def uuid_str():
    return str(uuid4())


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


# ============================================================
# AI Copilot Module
# ============================================================

class ConversationSession(Base):
    """Live sales conversation session linked to a lead."""
    __tablename__ = "conversation_sessions"
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True, index=True)
    started_at = Column(DateTime, default=utcnow, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    # active | ended
    status = Column(String(20), default="active", nullable=False)

    messages = relationship("ConversationMessage", back_populates="session",
                            cascade="all, delete-orphan", order_by="ConversationMessage.created_at")
    suggestions = relationship("CopilotSuggestion", back_populates="session",
                               cascade="all, delete-orphan", order_by="CopilotSuggestion.created_at")


class ConversationMessage(Base):
    """One turn inside a ConversationSession."""
    __tablename__ = "conversation_messages"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("conversation_sessions.id"), nullable=False, index=True)
    # Customer | Salesperson
    speaker = Column(String(40), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    session = relationship("ConversationSession", back_populates="messages")


class CopilotSuggestion(Base):
    """AI-generated suggestion for a conversation turn."""
    __tablename__ = "copilot_suggestions"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("conversation_sessions.id"), nullable=False, index=True)
    # next_question | product_suggestion | offer_suggestion | objection_handling | closing_suggestion
    suggestion_type = Column(String(40), nullable=False)
    content = Column(Text, nullable=False)
    confidence = Column(Float, default=0.8)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    session = relationship("ConversationSession", back_populates="suggestions")


class LeadInsight(Base):
    """Persisted AI qualification insight for a lead."""
    __tablename__ = "lead_insights"
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, unique=True, index=True)
    lead_score = Column(Integer, default=0)        # 0–100
    intent = Column(String(200))
    budget = Column(String(100))
    timeline = Column(String(100))
    decision_maker = Column(String(100))
    summary = Column(Text)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)


class ConversationMemory(Base):
    """Conversation Memory Table for telemetry analysis."""
    __tablename__ = "conversation_memory"
    memory_id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(100), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    salesperson_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    channel = Column(String(50))  # 'Call', 'WhatsApp', 'CRM'
    raw_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class TranscriptChunk(Base):
    """Transcript chunks collected during live streaming sessions."""
    __tablename__ = "transcript_chunks"
    chunk_id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(100), nullable=False, index=True)
    speaker_label = Column(String(50))  # 'Customer' | 'Salesperson'
    chunk_text = Column(Text, nullable=False)
    start_time = Column(Float)
    end_time = Column(Float)
    received_at = Column(DateTime, default=utcnow, nullable=False)


class IntentLog(Base):
    """Logs intent classification events and confidence scores."""
    __tablename__ = "intent_logs"
    intent_id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(100), nullable=False, index=True)
    text_segment = Column(Text, nullable=False)
    classified_intent = Column(String(100), nullable=False)
    confidence_score = Column(Float)
    logged_at = Column(DateTime, default=utcnow, nullable=False)


class RetrievalLog(Base):
    """Logs knowledge retrieval queries and matching results."""
    __tablename__ = "retrieval_logs"
    retrieval_id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(100), nullable=False, index=True)
    query_keywords = Column(Text, nullable=False)
    retrieved_source = Column(String(50))  # 'products', 'quotations', 'leads', 'history'
    source_reference_id = Column(Integer, nullable=False)
    retrieved_at = Column(DateTime, default=utcnow, nullable=False)


class AiFeedback(Base):
    """Human feedback log on Copilot suggestions."""
    __tablename__ = "ai_feedback"
    feedback_id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(100), nullable=False, index=True)
    ai_suggested_response = Column(Text, nullable=False)
    final_used_response = Column(Text, nullable=False)
    feedback_status = Column(String(20))  # 'accepted', 'edited', 'rejected'
    latency_ms = Column(Integer)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class Integration(Base):
    __tablename__ = "integrations"
    id = Column(Integer, primary_key=True, index=True)
    app_name = Column(String(50), unique=True, index=True, nullable=False)
    enabled = Column(Boolean, default=False, nullable=False)
    api_key = Column(String(255), nullable=True)
    secret_key = Column(String(255), nullable=True)
    webhook_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class Workflow(Base):
    __tablename__ = "workflows"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    trigger_type = Column(String(50), nullable=False)  # lead_created, task_overdue, whatsapp_inbound, appointment_created, quotation_generated
    actions = Column(Text, nullable=False)  # JSON serialized actions/steps array
    enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    runs = relationship("WorkflowRun", back_populates="workflow", cascade="all, delete-orphan")


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    status = Column(String(20), nullable=False, default="Success")  # Success | Failed | Pending
    logs = Column(Text)
    executed_at = Column(DateTime, default=utcnow, nullable=False)

    workflow = relationship("Workflow", back_populates="runs")


# ============================================================
# ParshCall AI Foundation / Multi-company AI OS
# ============================================================

class Company(Base):
    __tablename__ = "companies"
    id = Column(String(36), primary_key=True, default=uuid_str)
    name = Column(String(160), nullable=False)
    slug = Column(String(120), unique=True, index=True, nullable=False)
    brand_name = Column(String(160))
    website = Column(String(255))
    status = Column(String(30), default="active", nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)


class CompanyUser(Base):
    __tablename__ = "company_users"
    id = Column(String(36), primary_key=True, default=uuid_str)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    auth_user_id = Column(String(80), nullable=True, index=True)
    legacy_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    role = Column(String(20), default="Sales", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class BusinessProfile(Base):
    __tablename__ = "business_profiles"
    id = Column(String(36), primary_key=True, default=uuid_str)
    company_id = Column(String(36), ForeignKey("companies.id"), unique=True, nullable=False, index=True)
    about_company = Column(Text)
    mission = Column(Text)
    vision = Column(Text)
    services = Column(JSON, default=list, nullable=False)
    usp = Column(Text)
    office_locations = Column(JSON, default=list, nullable=False)
    business_hours = Column(JSON, default=dict, nullable=False)
    phone_numbers = Column(JSON, default=list, nullable=False)
    emails = Column(JSON, default=list, nullable=False)
    website = Column(String(255))
    social_links = Column(JSON, default=dict, nullable=False)
    google_maps = Column(Text)
    industries_served = Column(JSON, default=list, nullable=False)
    languages = Column(JSON, default=list, nullable=False)
    working_process = Column(Text)
    payment_terms = Column(Text)
    support_hours = Column(Text)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"
    id = Column(String(36), primary_key=True, default=uuid_str)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    title = Column(String(240), nullable=False)
    category = Column(String(80), nullable=False)
    source_type = Column(String(40), nullable=False)
    source_url = Column(Text)
    storage_bucket = Column(String(120))
    storage_path = Column(Text)
    folder_path = Column(Text)
    tags = Column(JSON, default=list, nullable=False)
    status = Column(String(30), default="draft", nullable=False)
    created_by = Column(String(80))
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)


class KnowledgeDocumentVersion(Base):
    __tablename__ = "knowledge_document_versions"
    id = Column(String(36), primary_key=True, default=uuid_str)
    document_id = Column(String(36), ForeignKey("knowledge_documents.id"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    content_text = Column(Text)
    storage_path = Column(Text)
    change_note = Column(Text)
    created_by = Column(String(80))
    created_at = Column(DateTime, default=utcnow, nullable=False)


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"
    id = Column(String(36), primary_key=True, default=uuid_str)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    document_id = Column(String(36), ForeignKey("knowledge_documents.id"), nullable=False, index=True)
    version_id = Column(String(36), ForeignKey("knowledge_document_versions.id"), nullable=True, index=True)
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    token_count = Column(Integer, default=0, nullable=False)
    embedding_model = Column(String(120))
    embedding = Column(JSON)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class AITrainingJob(Base):
    __tablename__ = "ai_training_jobs"
    id = Column(String(36), primary_key=True, default=uuid_str)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    status = Column(String(30), default="queued", nullable=False)
    last_training_at = Column(DateTime)
    documents_used = Column(Integer, default=0, nullable=False)
    embeddings_count = Column(Integer, default=0, nullable=False)
    tokens = Column(Integer, default=0, nullable=False)
    progress = Column(Integer, default=0, nullable=False)
    error_message = Column(Text)
    created_by = Column(String(80))
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)


class AITrainingSource(Base):
    __tablename__ = "ai_training_sources"
    id = Column(String(36), primary_key=True, default=uuid_str)
    training_job_id = Column(String(36), ForeignKey("ai_training_jobs.id"), nullable=False, index=True)
    source_type = Column(String(40), nullable=False)
    source_id = Column(String(36))
    status = Column(String(30), default="pending", nullable=False)
    approved_by = Column(String(80))
    approved_at = Column(DateTime)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class SalesPlaybook(Base):
    __tablename__ = "sales_playbooks"
    id = Column(String(36), primary_key=True, default=uuid_str)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    is_default = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)


class SalesPlaybookStage(Base):
    __tablename__ = "sales_playbook_stages"
    id = Column(String(36), primary_key=True, default=uuid_str)
    playbook_id = Column(String(36), ForeignKey("sales_playbooks.id"), nullable=False, index=True)
    stage_name = Column(String(80), nullable=False)
    sort_order = Column(Integer, nullable=False)
    goal = Column(Text)
    prompt = Column(Text)
    success_criteria = Column(Text)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class Objection(Base):
    __tablename__ = "objections"
    id = Column(String(36), primary_key=True, default=uuid_str)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    objection = Column(Text, nullable=False)
    recommended_response = Column(Text, nullable=False)
    alternative_response = Column(Text)
    escalation_rule = Column(Text)
    success_rate = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)


class AICallIntelligence(Base):
    __tablename__ = "ai_call_intelligence"
    id = Column(String(36), primary_key=True, default=uuid_str)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True, index=True)
    call_id = Column(Integer, ForeignKey("calls.id"), nullable=True, index=True)
    vapi_call_id = Column(String(120), index=True)
    transcript = Column(Text)
    recording_bucket = Column(String(120))
    recording_path = Column(Text)
    summary = Column(Text)
    customer_intent = Column(Text)
    sentiment = Column(String(30))
    budget = Column(String(120))
    industry = Column(String(160))
    timeline = Column(String(120))
    decision_maker = Column(String(160))
    interested_services = Column(JSON, default=list, nullable=False)
    pain_points = Column(JSON, default=list, nullable=False)
    competitor_mentioned = Column(String(160))
    objections = Column(JSON, default=list, nullable=False)
    meeting_booked = Column(Boolean, default=False, nullable=False)
    lead_score = Column(Integer)
    next_action = Column(Text)
    crm_update = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class CustomerConversationMemory(Base):
    __tablename__ = "conversation_memories"
    id = Column(String(36), primary_key=True, default=uuid_str)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True, index=True)
    customer_key = Column(String(160), index=True)
    last_call_at = Column(DateTime)
    past_objections = Column(JSON, default=list, nullable=False)
    budget = Column(String(120))
    requirements = Column(Text)
    meeting_history = Column(JSON, default=list, nullable=False)
    proposal_sent = Column(Boolean, default=False, nullable=False)
    notes = Column(Text)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)


class TrainingExample(Base):
    __tablename__ = "training_examples"
    id = Column(String(36), primary_key=True, default=uuid_str)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    call_intelligence_id = Column(String(36), ForeignKey("ai_call_intelligence.id"), nullable=True, index=True)
    transcript = Column(Text)
    ai_response = Column(Text)
    human_correction = Column(Text)
    outcome = Column(String(80))
    customer_rating = Column(Integer)
    meeting_success = Column(Boolean)
    admin_feedback = Column(Text)
    approval_status = Column(String(30), default="pending", nullable=False)
    approved_by = Column(String(80))
    approved_at = Column(DateTime)
    created_at = Column(DateTime, default=utcnow, nullable=False)
