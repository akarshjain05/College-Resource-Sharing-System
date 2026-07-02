import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ComplaintStatus
from app.schemas.user import UserResponse


class ComplaintCreate(BaseModel):
    subject: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10)
    against_user_id: Optional[uuid.UUID] = None
    resource_id: Optional[uuid.UUID] = None


class ComplaintAdminUpdate(BaseModel):
    status: ComplaintStatus
    admin_response: Optional[str] = None


class ComplaintResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    subject: str
    description: str
    status: ComplaintStatus
    admin_response: Optional[str] = None
    filed_by: UserResponse
    created_at: datetime
