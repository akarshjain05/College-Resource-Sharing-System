import uuid
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.enums import PaymentStatus


class PaymentOrderCreate(BaseModel):
    borrow_request_id: uuid.UUID


class PaymentOrderResponse(BaseModel):
    """Everything the frontend needs to open Razorpay Checkout. No secret ever included."""
    payment_id: uuid.UUID
    razorpay_order_id: str
    razorpay_key_id: str
    amount: int              # paise — what Checkout must display/charge
    currency: str
    rent_amount: int
    deposit_amount: int


class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    borrow_request_id: uuid.UUID
    status: PaymentStatus
    created_at: datetime
    rent_amount: int
    deposit_amount: int
    total_amount: int
    currency: str
    refunded_amount: int
    failure_reason: Optional[str] = None
