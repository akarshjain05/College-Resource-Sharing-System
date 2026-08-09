from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, Enum as SAEnum, String, Integer, DateTime, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin
from app.models.enums import PaymentStatus


class Payment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "payments"
    __table_args__ = (
        UniqueConstraint("borrow_request_id", name="uq_payment_borrow_request"),
    )

    borrow_request_id: Mapped[Optional[UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("borrow_requests.id"), nullable=True
    )
    payer_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    razorpay_order_id: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True, index=True)
    razorpay_payment_id: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True, index=True)
    razorpay_signature: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    # All amounts in paise (integer, smallest currency unit) to match Razorpay exactly.
    rent_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    deposit_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    total_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR")

    status: Mapped[PaymentStatus] = mapped_column(
        SAEnum(PaymentStatus, values_callable=lambda obj: [e.value for e in obj]),
        default=PaymentStatus.CREATED, index=True,
    )

    refund_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    refunded_amount: Mapped[int] = mapped_column(Integer, default=0)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Every webhook delivery we've already processed, so a Razorpay retry can't double-apply an event.
    last_webhook_event_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    borrow_request: Mapped[Optional["BorrowRequest"]] = relationship("BorrowRequest")
    payer: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<Payment {self.id} order={self.razorpay_order_id} status={self.status}>"
