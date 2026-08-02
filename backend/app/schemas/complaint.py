import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ComplaintStatus
from app.schemas.user import UserResponse


class ComplaintCreate(BaseModel):
    category: Optional[str] = Field(default="general", max_length=50)
    subject: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10)
    against_user_id: Optional[uuid.UUID] = None
    resource_id: Optional[uuid.UUID] = None
    borrow_request_id: Optional[uuid.UUID] = None


class ComplaintAdminUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: ComplaintStatus
    admin_response: Optional[str] = None
    trust_score_penalty: Optional[int] = Field(None, description="Amount to deduct from the against_user's trust score")


class ResourceMinResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str


class BorrowRequestMinResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    status: str
    start_date: datetime
    end_date: datetime


class ComplaintResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category: Optional[str] = "general"
    subject: str
    description: str
    status: ComplaintStatus
    admin_response: Optional[str] = None
    filed_by: UserResponse
    against_user_id: Optional[uuid.UUID] = None
    against_user: Optional[UserResponse] = None
    resource_id: Optional[uuid.UUID] = None
    resource: Optional[ResourceMinResponse] = None
    borrow_request_id: Optional[uuid.UUID] = None
    borrow_request: Optional[BorrowRequestMinResponse] = None
    created_at: datetime
