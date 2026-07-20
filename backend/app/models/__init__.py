"""
Import every model here so that `Base.metadata` is fully populated
when Alembic (or `Base.metadata.create_all`) inspects it.
"""
from app.models.base import UUIDMixin, TimestampMixin
from app.models.user import User  # noqa: F401
from app.models.category import Category  # noqa: F401
from app.models.resource import Resource, ResourceImage  # noqa: F401
from app.models.borrow import BorrowRequest  # noqa: F401
from app.models.misc import Review, Notification, AuditLog, Complaint  # noqa: F401
from app.models.wanted import WantedRequest  # noqa: F401
from app.models.damage_claim import DamageClaim  # noqa: F401
