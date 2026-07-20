from typing import List, Optional
from datetime import datetime

from sqlalchemy import String, Boolean, Enum as SAEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin
from app.models.enums import UserRole, AuthProvider


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    # Nullable because Google-authenticated accounts never set a local password.
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.STUDENT, nullable=False)

    auth_provider: Mapped[AuthProvider] = mapped_column(
        SAEnum(AuthProvider, values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        default=AuthProvider.LOCAL,
        nullable=False,
    )
    google_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True, index=True)

    student_id: Mapped[Optional[str]] = mapped_column(String(50), unique=True, nullable=True)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    course: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    year_of_study: Mapped[Optional[int]] = mapped_column(nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    skills: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # comma-separated tags
    profile_picture_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    phone_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_suspended: Mapped[bool] = mapped_column(Boolean, default=False)

    trust_score: Mapped[int] = mapped_column(default=100)
    sharing_score: Mapped[int] = mapped_column(default=0)

    avg_response_seconds: Mapped[Optional[int]] = mapped_column(nullable=True)
    response_count: Mapped[int] = mapped_column(default=0)

    resources: Mapped[List["Resource"]] = relationship(
        "Resource", back_populates="owner", cascade="all, delete-orphan"
    )
    borrow_requests: Mapped[List["BorrowRequest"]] = relationship(
        "BorrowRequest", back_populates="borrower", foreign_keys="BorrowRequest.borrower_id"
    )
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )
    reviews_written: Mapped[List["Review"]] = relationship(
        "Review", back_populates="reviewer", foreign_keys="Review.reviewer_id"
    )

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role})>"