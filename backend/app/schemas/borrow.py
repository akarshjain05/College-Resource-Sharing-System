import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import BorrowStatus
from app.schemas.user import UserResponse
from app.schemas.resource import ResourceResponse


class BorrowRequestCreate(BaseModel):
    resource_id: uuid.UUID
    requested_start_date: date
    requested_end_date: date
    purpose: Optional[str] = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.requested_end_date < self.requested_start_date:
            raise ValueError("requested_end_date must be on or after requested_start_date")
        return self


class BorrowRequestDecision(BaseModel):
    rejection_reason: Optional[str] = None


class BorrowRequestReturn(BaseModel):
    damage_report: Optional[str] = None


class BorrowRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: BorrowStatus
    requested_start_date: date
    requested_end_date: date
    actual_return_date: Optional[date] = None
    purpose: Optional[str] = None
    deposit_paid: Optional[float] = None
    damage_report: Optional[str] = None
    rejection_reason: Optional[str] = None
    resource: ResourceResponse
    borrower: UserResponse
    lender: UserResponse
    created_at: datetime
