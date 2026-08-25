import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class ChatMessage(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "chat_messages"
    
    borrow_request_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("borrow_requests.id"), nullable=False, index=True)
    sender_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    body: Mapped[str] = mapped_column(String(1000), nullable=False)
    message_type: Mapped[str] = mapped_column(String(50), default="text", nullable=False)
    metadata_payload: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    borrow_request = relationship("BorrowRequest")
    sender = relationship("User")
