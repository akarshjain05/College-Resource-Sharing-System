import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import BorrowStatus
from app.schemas.user import UserResponse
from app.schemas.resource import ResourceResponse
from app.schemas.payment import PaymentResponse
from app.utils.validation import SafeStr


class BorrowRequestCreate(BaseModel):
    resource_id: uuid.UUID
    requested_start_date: datetime
    requested_end_date: datetime
    purpose: Optional[SafeStr] = Field(None, max_length=1000)

    @model_validator(mode="after")
    def validate_dates(self):
        if self.requested_end_date <= self.requested_start_date:
            raise ValueError("requested_end_date must be strictly after requested_start_date")
        return self


class BorrowRequestDecision(BaseModel):
    rejection_reason: Optional[SafeStr] = Field(None, max_length=500)

class BorrowCancelRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)

class BorrowRequestReturn(BaseModel):
    damage_report: Optional[SafeStr] = Field(None, max_length=1000)
    lender_rating: Optional[int] = Field(None, ge=1, le=5)
    lender_review: Optional[SafeStr] = Field(None, max_length=1000)


class BorrowRequestConfirmReturn(BaseModel):
    borrower_rating: Optional[int] = Field(None, ge=1, le=5)
    borrower_review: Optional[SafeStr] = Field(None, max_length=1000)
    damage_report: Optional[SafeStr] = Field(None, max_length=1000)
    damage_evidence_url: Optional[str] = Field(None, max_length=500)


class BorrowRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: BorrowStatus
    requested_start_date: Optional[datetime] = None
    requested_end_date: Optional[datetime] = None
    actual_return_date: Optional[datetime] = None
    purpose: Optional[str] = None
    deposit_paid: Optional[float] = None
    damage_report: Optional[str] = None
    rejection_reason: Optional[str] = None
    cancellation_reason: Optional[str] = None
    cancellation_requested_by_id: Optional[UUID] = None
    borrower_rating: Optional[int] = None
    borrower_review: Optional[str] = None
    lender_rating: Optional[int] = None
    lender_review: Optional[str] = None
    resource: Optional[ResourceResponse] = None
    borrower: Optional[UserResponse] = None
    lender: Optional[UserResponse] = None
    payment: Optional[PaymentResponse] = None
    created_at: datetime
