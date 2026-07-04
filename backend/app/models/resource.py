from typing import List, Optional

from sqlalchemy import String, Text, Integer, ForeignKey, Enum as SAEnum, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin
from app.models.enums import ResourceCondition, ResourceStatus


class Resource(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "resources"

    title: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    condition: Mapped[ResourceCondition] = mapped_column(
        SAEnum(ResourceCondition), default=ResourceCondition.GOOD
    )
    status: Mapped[ResourceStatus] = mapped_column(
        SAEnum(ResourceStatus), default=ResourceStatus.AVAILABLE, index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    quantity_available: Mapped[int] = mapped_column(Integer, default=1)

    pickup_location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    tags: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # comma-separated
    barcode: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True)
    qr_code_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    deposit_amount: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), default=0)
    max_borrow_days: Mapped[int] = mapped_column(Integer, default=7)

    average_rating: Mapped[float] = mapped_column(Numeric(3, 2), default=0)
    total_borrows: Mapped[int] = mapped_column(Integer, default=0)
    view_count: Mapped[int] = mapped_column(Integer, default=0)

    owner_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    category_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False
    )

    owner: Mapped["User"] = relationship("User", back_populates="resources")
    category: Mapped["Category"] = relationship("Category", back_populates="resources")
    images: Mapped[List["ResourceImage"]] = relationship(
        "ResourceImage",
        back_populates="resource",
        cascade="all, delete-orphan",
        order_by="ResourceImage.created_at"
    )
    borrow_requests: Mapped[List["BorrowRequest"]] = relationship(
        "BorrowRequest", back_populates="resource", cascade="all, delete-orphan"
    )
    reviews: Mapped[List["Review"]] = relationship(
        "Review", back_populates="resource", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Resource {self.title}>"


class ResourceImage(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "resource_images"

    resource_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resources.id"), nullable=False
    )
    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    is_primary: Mapped[bool] = mapped_column(default=False)

    resource: Mapped["Resource"] = relationship("Resource", back_populates="images")
