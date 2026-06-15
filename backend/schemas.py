"""Pydantic schemas for API IO."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict


# ---------------- Auth ----------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserOut"


class RefreshIn(BaseModel):
    refresh_token: str


# ---------------- Users ----------------
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str = "Sales"
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserOut(UserBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ---------------- Leads ----------------
class LeadBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    company: Optional[str] = None
    city: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = "New"
    budget: Optional[float] = 0.0
    customer_type: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[int] = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    company: Optional[str] = None
    city: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    budget: Optional[float] = None
    customer_type: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[int] = None


class LeadOut(LeadBase):
    id: int
    created_at: datetime
    updated_at: datetime
    lead_score: Optional[int] = None
    intent: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class LeadListOut(BaseModel):
    items: List[LeadOut]
    total: int
    page: int
    page_size: int


# ---------------- Activities ----------------
class ActivityBase(BaseModel):
    lead_id: int
    activity_type: str
    description: str


class ActivityCreate(ActivityBase):
    pass


class ActivityOut(ActivityBase):
    id: int
    created_by: Optional[int]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ---------------- Calls ----------------
class CallBase(BaseModel):
    lead_id: int
    call_duration: int = 0
    call_status: str = "Completed"
    call_summary: Optional[str] = None
    transcript: Optional[str] = None
    sentiment: Optional[str] = None
    vapi_call_id: Optional[str] = None


class CallCreate(BaseModel):
    lead_id: int
    call_duration: int = 0
    call_status: str = "Completed"
    call_summary: Optional[str] = None


class CallUpdate(BaseModel):
    call_duration: Optional[int] = None
    call_status: Optional[str] = None
    call_summary: Optional[str] = None
    transcript: Optional[str] = None
    sentiment: Optional[str] = None


class CallOut(CallBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ---------------- Tasks ----------------
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    lead_id: Optional[int] = None
    assigned_to: Optional[int] = None
    priority: str = "Medium"
    status: str = "Open"
    due_date: Optional[datetime] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    lead_id: Optional[int] = None
    assigned_to: Optional[int] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None


class TaskOut(TaskBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ---------------- WhatsApp ----------------
class WhatsappBase(BaseModel):
    lead_id: int
    direction: str  # in | out
    message: str


class WhatsappCreate(WhatsappBase):
    pass


class WhatsappOut(WhatsappBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ---------------- Notifications ----------------
class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ---------------- Products ----------------
class ProductBase(BaseModel):
    product_name: str
    category: Optional[str] = None
    metal_type: Optional[str] = None
    purity: Optional[str] = None
    weight: Optional[float] = 0.0
    making_charges: Optional[float] = 0.0
    price: Optional[float] = 0.0


class ProductCreate(ProductBase):
    pass


class ProductUpdate(ProductBase):
    product_name: Optional[str] = None


class ProductOut(ProductBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ---------------- Appointments ----------------
class AppointmentBase(BaseModel):
    customer_name: str
    appointment_date: datetime
    lead_id: Optional[int] = None
    showroom_visit: bool = True
    notes: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    customer_name: Optional[str] = None
    appointment_date: Optional[datetime] = None
    lead_id: Optional[int] = None
    showroom_visit: Optional[bool] = None
    notes: Optional[str] = None


class AppointmentOut(AppointmentBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ---------------- Quotations ----------------
class QuotationBase(BaseModel):
    lead_id: int
    quotation_number: str
    amount: float = 0.0
    status: str = "Draft"


class QuotationCreate(BaseModel):
    lead_id: int
    amount: float = 0.0
    status: str = "Draft"


class QuotationUpdate(BaseModel):
    amount: Optional[float] = None
    status: Optional[str] = None


class QuotationOut(QuotationBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ---------------- AI Agent Logs ----------------
class AILogBase(BaseModel):
    lead_id: int
    conversation_summary: Optional[str] = None
    sentiment: Optional[str] = None
    next_action: Optional[str] = None


class AILogCreate(AILogBase):
    pass


class AILogOut(AILogBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ---------------- Dashboard ----------------
class DashboardStats(BaseModel):
    total_leads: int
    new_leads: int
    won_leads: int
    lost_leads: int
    open_tasks: int
    completed_tasks: int
    total_calls: int
    total_appointments: int
    pipeline_value: float
    won_value: float
    lead_status_distribution: dict
    lead_source_distribution: dict
    task_completion_rate: float
    # Phase 3 AI fields
    hot_leads: List[dict] = []
    revenue_at_risk: float = 0.0
    conversion_forecast: float = 0.0


# ---------------- Settings ----------------
class CallingSettings(BaseModel):
    daily_call_limit: int = 500
    start_time: str = "10:00"
    end_time: str = "18:00"
    calls_per_minute: int = 5
    enabled: bool = True


class CallingSettingsUpdate(BaseModel):
    daily_call_limit: Optional[int] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    calls_per_minute: Optional[int] = None
    enabled: Optional[bool] = None


# ---------------- Campaigns ----------------
class LeadFilterSpec(BaseModel):
    status: Optional[List[str]] = None
    source: Optional[List[str]] = None
    assigned_to: Optional[List[int]] = None
    city: Optional[List[str]] = None
    lead_ids: Optional[List[int]] = None  # explicit override


class CsvTarget(BaseModel):
    name: str
    phone: str
    city: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None
    lead_prompt_override: Optional[str] = None


class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    campaign_prompt: Optional[str] = None
    source_type: str = "leads"   # leads | csv | mixed
    filters: Optional[LeadFilterSpec] = None
    csv_targets: Optional[List[CsvTarget]] = None
    daily_call_limit: Optional[int] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    calls_per_minute: Optional[int] = None


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    campaign_prompt: Optional[str] = None
    daily_call_limit: Optional[int] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    calls_per_minute: Optional[int] = None


class CampaignStats(BaseModel):
    total_targets: int = 0
    pending: int = 0
    in_progress: int = 0  # queued+dialing+ringing
    completed: int = 0
    failed: int = 0
    busy: int = 0
    no_answer: int = 0
    connected: int = 0  # final_status == completed
    interested_leads: int = 0
    appointment_bookings: int = 0
    quotations_requested: int = 0
    conversion_rate: float = 0.0
    avg_lead_score: float = 0.0
    sentiment: dict = {}
    outcomes: dict = {}


class CampaignOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    status: str
    campaign_prompt: Optional[str] = None
    source_type: str
    filters_json: Optional[str] = None
    daily_call_limit: Optional[int] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    calls_per_minute: Optional[int] = None
    created_by: Optional[int] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    stats: Optional[CampaignStats] = None
    provider: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class CampaignListOut(BaseModel):
    items: List[CampaignOut]
    total: int


class CampaignTargetOut(BaseModel):
    id: int
    campaign_id: int
    lead_id: Optional[int] = None
    name: str
    phone: str
    city: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None
    lead_prompt_override: Optional[str] = None
    call_status: str
    attempts: int
    last_attempt_at: Optional[datetime] = None
    outcome: Optional[str] = None
    duration: int = 0
    transcript: Optional[str] = None
    summary: Optional[str] = None
    sentiment: Optional[str] = None
    lead_score: Optional[int] = None
    next_action: Optional[str] = None
    recording_url: Optional[str] = None
    call_cost: Optional[float] = 0.0
    vapi_call_id: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CampaignTargetListOut(BaseModel):
    items: List[CampaignTargetOut]
    total: int
    page: int
    page_size: int


class CampaignPreviewOut(BaseModel):
    total: int
    sample: List[dict]


TokenOut.model_rebuild()
