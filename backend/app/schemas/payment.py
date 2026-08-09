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


class WalletSummary(BaseModel):
    total_spent_paise: int
    total_earned_paise: int
    active_deposits_paise: int
    pending_to_be_paid_paise: int
    wallet_balance: int = 0

from pydantic import BaseModel, ConfigDict, Field

class WalletTopUpOrderCreate(BaseModel):
    amount_paise: int = Field(ge=10000, le=1000000, description="Minimum 100 INR, Maximum 10000 INR")

class WalletPayRequest(BaseModel):
    borrow_request_id: uuid.UUID


class TransactionItem(BaseModel):
    id: str
    borrow_request_id: str
    status: str
    rent_amount: int
    deposit_amount: int
    total_amount: int
    currency: str
    refunded_amount: int
    created_at: str
    razorpay_payment_id: Optional[str] = None
    transaction_type: str
    item_title: str
    item_image: Optional[str] = None
    other_party_name: str
    borrow_status: str
    is_to_be_paid: bool = False


class MyTransactionsResponse(BaseModel):
    summary: WalletSummary
    transactions: list[TransactionItem]

