from typing import Optional

from sqlalchemy import ForeignKey, Text, Integer, Numeric, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin
from app.models.enums import DamageClaimStatus


class DamageClaim(Base, UUIDMixin, TimestampMixin):
    """
    Tracks damage claims filed by lenders against borrowers.
    Created automatically when a lender confirms return with a damage report.
    The borrower can dispute, and an admin adjudicates the final outcome.
    Trust score penalties are only applied after admin resolution.
    """
    __tablename__ = "damage_claims"

    borrow_request_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("borrow_requests.id"), nullable=False, unique=True
    )
    filed_by_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    against_user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    description: Mapped[str] = mapped_column(Text, nullable=False)
    estimated_cost: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)

    dispute_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    status: Mapped[DamageClaimStatus] = mapped_column(
        SAEnum(DamageClaimStatus), default=DamageClaimStatus.OPEN, index=True
    )

    admin_resolution: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    final_cost: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    trust_penalty_applied: Mapped[int] = mapped_column(Integer, default=0)

    borrow_request: Mapped["BorrowRequest"] = relationship("BorrowRequest")
    filed_by: Mapped["User"] = relationship("User", foreign_keys=[filed_by_id])
    against_user: Mapped["User"] = relationship("User", foreign_keys=[against_user_id])

    def __repr__(self) -> str:
        return f"<DamageClaim {self.id} status={self.status}>"
