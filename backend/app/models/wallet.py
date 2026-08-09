from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, Enum as SAEnum, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin
from app.models.enums import WalletTransactionType


class WalletTransaction(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "wallet_transactions"

    user_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    amount: Mapped[int] = mapped_column(Integer, nullable=False) # In paise
    type: Mapped[WalletTransactionType] = mapped_column(
        SAEnum(WalletTransactionType, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False, index=True
    )
    reference_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True) # Payment ID or BorrowRequest ID

    user: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<WalletTransaction {self.id} user={self.user_id} amount={self.amount} type={self.type}>"
