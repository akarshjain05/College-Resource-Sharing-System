from typing import Optional

from sqlalchemy import ForeignKey, Text, Integer, Boolean, String, Enum as SAEnum
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin
from app.models.enums import NotificationType, ComplaintStatus


class Review(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "reviews"

    resource_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resources.id"), nullable=False
    )
    borrow_request_id: Mapped[Optional[UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("borrow_requests.id"), nullable=True
    )
    reviewer_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    resource: Mapped["Resource"] = relationship("Resource", back_populates="reviews")
    reviewer: Mapped["User"] = relationship(
        "User", back_populates="reviews_written", foreign_keys=[reviewer_id]
    )

    __table_args__ = (
        sa.UniqueConstraint('borrow_request_id', 'reviewer_id', name='uq_review_borrow_request_reviewer'),
    )


class Notification(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "notifications"

    user_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    type: Mapped[NotificationType] = mapped_column(SAEnum(NotificationType, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="notifications")


class AuditLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "audit_logs"

    actor_id: Mapped[Optional[UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(150), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)


class Complaint(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "complaints"

    filed_by_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    against_user_id: Mapped[Optional[UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    resource_id: Mapped[Optional[UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resources.id"), nullable=True
    )
    borrow_request_id: Mapped[Optional[UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("borrow_requests.id"), nullable=True
    )
    category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="general")
    severity: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default="medium")
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[ComplaintStatus] = mapped_column(SAEnum(ComplaintStatus, values_callable=lambda obj: [e.value for e in obj]), default=ComplaintStatus.OPEN)
    assigned_to_id: Mapped[Optional[UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    admin_response: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolution_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    filed_by: Mapped["User"] = relationship("User", foreign_keys=[filed_by_id])
    against_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[against_user_id])
    assigned_to: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assigned_to_id])
    resource: Mapped[Optional["Resource"]] = relationship("Resource")
    borrow_request: Mapped[Optional["BorrowRequest"]] = relationship("BorrowRequest")
