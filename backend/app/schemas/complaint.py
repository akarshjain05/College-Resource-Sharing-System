import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ComplaintStatus
from app.schemas.user import UserResponse
from app.utils.validation import SafeStr


class ComplaintCreate(BaseModel):
    subject: SafeStr = Field(..., min_length=3, max_length=200)
    description: SafeStr = Field(..., min_length=10, max_length=5000)
    against_user_id: Optional[uuid.UUID] = None
    resource_id: Optional[uuid.UUID] = None
    borrow_request_id: Optional[uuid.UUID] = None


class ComplaintAdminUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: ComplaintStatus
    admin_response: Optional[SafeStr] = Field(None, max_length=5000)
    trust_score_penalty: Optional[int] = Field(None, description="Amount to deduct from the against_user's trust score")


class ComplaintResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    subject: str
    description: str
    borrow_request_id: Optional[uuid.UUID] = None
    status: ComplaintStatus
    admin_response: Optional[str] = None
    filed_by: UserResponse
    created_at: datetime
