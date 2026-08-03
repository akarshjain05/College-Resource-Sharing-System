from pydantic import BaseModel, UUID4, Field
from datetime import datetime
from typing import Optional
from enum import Enum

class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    FAILED = "FAILED"

class PaymentBase(BaseModel):
    amount: float = Field(..., gt=0)
    reason: str
    status: PaymentStatus = PaymentStatus.PENDING
    borrow_request_id: Optional[UUID4] = None

class PaymentCreate(PaymentBase):
    user_id: UUID4

class PaymentUpdate(BaseModel):
    status: PaymentStatus

class PaymentResponse(PaymentBase):
    id: UUID4
    user_id: UUID4
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
