from datetime import date
from typing import Optional

from sqlalchemy import ForeignKey, Enum as SAEnum, Date, Text, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin
from app.models.enums import BorrowStatus


class BorrowRequest(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "borrow_requests"

    resource_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resources.id"), nullable=False
    )
    borrower_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    lender_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    status: Mapped[BorrowStatus] = mapped_column(
        SAEnum(BorrowStatus), default=BorrowStatus.REQUESTED, index=True
    )

    requested_start_date: Mapped[date] = mapped_column(Date, nullable=False)
    requested_end_date: Mapped[date] = mapped_column(Date, nullable=False)
    actual_return_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    purpose: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    deposit_paid: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), default=0)
    damage_report: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    resource: Mapped["Resource"] = relationship("Resource", back_populates="borrow_requests")
    borrower: Mapped["User"] = relationship(
        "User", back_populates="borrow_requests", foreign_keys=[borrower_id]
    )
    lender: Mapped["User"] = relationship("User", foreign_keys=[lender_id])

    def __repr__(self) -> str:
        return f"<BorrowRequest {self.id} status={self.status}>"
