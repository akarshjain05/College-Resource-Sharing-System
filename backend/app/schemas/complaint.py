import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator

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
    status: Optional[str] = "requested"
    requested_start_date: Optional[datetime] = None
    requested_end_date: Optional[datetime] = None

    @model_validator(mode="before")
    @classmethod
    def populate_start_end_dates(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "requested_start_date" not in data and "start_date" in data:
                data["requested_start_date"] = data["start_date"]
            if "requested_end_date" not in data and "end_date" in data:
                data["requested_end_date"] = data["end_date"]
        return data

    @computed_field
    def start_date(self) -> Optional[datetime]:
        return self.requested_start_date

    @computed_field
    def end_date(self) -> Optional[datetime]:
        return self.requested_end_date


class ComplaintResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category: Optional[str] = "general"
    subject: Optional[str] = ""
    description: Optional[str] = ""
    status: Optional[ComplaintStatus] = ComplaintStatus.OPEN
    admin_response: Optional[str] = None
    filed_by: Optional[UserResponse] = None
    against_user_id: Optional[uuid.UUID] = None
    against_user: Optional[UserResponse] = None
    resource_id: Optional[uuid.UUID] = None
    resource: Optional[ResourceMinResponse] = None
    borrow_request_id: Optional[uuid.UUID] = None
    borrow_request: Optional[BorrowRequestMinResponse] = None
    created_at: Optional[datetime] = None
