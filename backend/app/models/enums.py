"""
Shared Python enums, mapped to Postgres via SQLAlchemy's Enum type.
"""
import enum


class UserRole(str, enum.Enum):
    STUDENT = "student"
    FACULTY = "faculty"
    CLUB = "club"
    ADMIN = "admin"


class ResourceCondition(str, enum.Enum):
    NEW = "new"
    GOOD = "good"
    FAIR = "fair"
    WORN = "worn"


class ResourceStatus(str, enum.Enum):
    AVAILABLE = "available"
    BORROWED = "borrowed"
    UNAVAILABLE = "unavailable"
    PENDING_APPROVAL = "pending_approval"


class BorrowStatus(str, enum.Enum):
    REQUESTED = "requested"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    ACTIVE = "active"
    RETURN_REQUESTED = "return_requested"
    RETURNED = "returned"
    LATE = "late"
    DAMAGED = "damaged"


class NotificationType(str, enum.Enum):
    BORROW_REQUEST = "borrow_request"
    BORROW_APPROVED = "borrow_approved"
    BORROW_REJECTED = "borrow_rejected"
    RETURN_REMINDER = "return_reminder"
    RETURN_CONFIRMED = "return_confirmed"
    NEW_REVIEW = "new_review"
    SYSTEM = "system"


class ComplaintStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"
