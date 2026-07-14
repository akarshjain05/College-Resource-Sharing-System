import uuid
from datetime import datetime

from sqlalchemy import String, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class WantedRequest(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "wanted_requests"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(1000), nullable=True)
    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    is_fulfilled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user = relationship("User")
    category = relationship("Category")
