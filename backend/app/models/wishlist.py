from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class WishlistItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "wishlist_items"

    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    resource_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resources.id"), nullable=False
    )

    resource: Mapped["Resource"] = relationship("Resource")
    user: Mapped["User"] = relationship("User")

    __table_args__ = (
        UniqueConstraint("user_id", "resource_id", name="uq_wishlist_user_resource"),
    )

    def __repr__(self) -> str:
        return f"<WishlistItem user={self.user_id} resource={self.resource_id}>"
