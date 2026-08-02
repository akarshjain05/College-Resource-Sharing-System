import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ComplaintStatus
from app.schemas.user import UserResponse


class ComplaintCreate(BaseModel):
    category: Optional[str] = Field(default="general", max_length=50)
    severity: Optional[str] = Field(default="medium", max_length=20)
    subject: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10)
    evidence_url: Optional[str] = None
    against_user_id: Optional[uuid.UUID] = None
    resource_id: Optional[uuid.UUID] = None
    borrow_request_id: Optional[uuid.UUID] = None


class ComplaintAdminUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Optional[ComplaintStatus] = None
    assigned_to_id: Optional[uuid.UUID] = None
    admin_response: Optional[str] = None
    resolution_action: Optional[str] = Field(None, description="refund_issued, replacement_provided, warning_issued, dismissed")
    resolution_amount: Optional[float] = None
    resolution_notes: Optional[str] = None
    trust_score_penalty: Optional[int] = Field(None, description="Amount to deduct from the against_user's trust score")


class ResourceMinResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str


class BorrowRequestMinResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    status: str


class ComplaintResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category: Optional[str] = "general"
    severity: Optional[str] = "medium"
    subject: str
    description: str
    evidence_url: Optional[str] = None
    status: ComplaintStatus
    assigned_to_id: Optional[uuid.UUID] = None
    assigned_to: Optional[UserResponse] = None
    admin_response: Optional[str] = None
    resolution_data: Optional[str] = None
    filed_by: UserResponse
    against_user_id: Optional[uuid.UUID] = None
    against_user: Optional[UserResponse] = None
    resource_id: Optional[uuid.UUID] = None
    resource: Optional[ResourceMinResponse] = None
    borrow_request_id: Optional[uuid.UUID] = None
    borrow_request: Optional[BorrowRequestMinResponse] = None
    created_at: datetime
