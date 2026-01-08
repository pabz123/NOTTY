from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import Optional

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: int
    email: str

    model_config = {
        "from_attributes": True
    }

class ActivityCreate(BaseModel):
    title: str
    description: str | None = None
    deadline: datetime
    priority: str = "medium"  # low, medium, high
    category: str = "general"  # general, work, personal, health, finance, education, other
    is_recurring: bool = False
    recurrence_pattern: str | None = None  # daily, weekly, monthly
    notification_minutes: int = 30  # minutes before deadline
    estimated_minutes: int | None = None  # Estimated time in minutes

class ActivityUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    notification_minutes: Optional[int] = None
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[str] = None
    estimated_minutes: Optional[int] = None
    actual_minutes: Optional[int] = None

class ActivityResponse(BaseModel):
    id: int
    title: str
    description: str | None
    deadline: datetime
    status: str
    priority: str
    category: str
    is_recurring: bool
    recurrence_pattern: str | None
    notification_minutes: int
    snoozed_until: datetime | None
    estimated_minutes: int | None
    actual_minutes: int | None

    model_config = {
        "from_attributes": True
    }

class ActivityNoteCreate(BaseModel):
    note: str

class ActivityNoteResponse(BaseModel):
    id: int
    activity_id: int
    note: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }

class SubtaskCreate(BaseModel):
    title: str
    order: int = 0

class SubtaskUpdate(BaseModel):
    title: Optional[str] = None
    is_completed: Optional[bool] = None
    order: Optional[int] = None

class SubtaskResponse(BaseModel):
    id: int
    activity_id: int
    title: str
    is_completed: bool
    order: int

    model_config = {
        "from_attributes": True
    }

class TemplateCreate(BaseModel):
    name: str
    title_template: str
    description_template: str | None = None
    priority: str = "medium"
    category: str = "general"
    estimated_minutes: int | None = None
    notification_minutes: int = 30

class TemplateResponse(BaseModel):
    id: int
    name: str
    title_template: str
    description_template: str | None
    priority: str
    category: str
    estimated_minutes: int | None
    notification_minutes: int

    model_config = {
        "from_attributes": True
    }

class ActivityHistoryResponse(BaseModel):
    id: int
    activity_id: int
    action: str
    field_name: str | None
    old_value: str | None
    new_value: str | None
    timestamp: datetime

    model_config = {
        "from_attributes": True
    }

class AttachmentResponse(BaseModel):
    id: int
    activity_id: int
    filename: str
    filesize: int
    content_type: str | None
    uploaded_at: datetime

    model_config = {
        "from_attributes": True
    }


    model_config = {
        "from_attributes": True
    }
