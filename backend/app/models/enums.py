"""
Shared Python enums, mapped to Postgres via SQLAlchemy's Enum type.
"""
import enum


class PaymentStatus(str, enum.Enum):
    CREATED = "created"
    ATTEMPTED = "attempted"
    PAID = "paid"
    FAILED = "failed"
    REFUND_INITIATED = "refund_initiated"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"


class PaymentPurpose(str, enum.Enum):
    RENT = "rent"
    SECURITY_DEPOSIT = "security_deposit"


class UserRole(str, enum.Enum):
    STUDENT = "student"
    FACULTY = "faculty"
    CLUB = "club"
    ADMIN = "admin"


class AuthProvider(str, enum.Enum):
    LOCAL = "local"
    GOOGLE = "google"


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
    HANDOVER_REQUESTED = "handover_requested"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    ACTIVE = "active"
    RETURN_REQUESTED = "return_requested"
    RETURNED = "returned"
    LATE = "late"
    DAMAGED = "damaged"


class DamageClaimStatus(str, enum.Enum):
    OPEN = "open"
    DISPUTED = "disputed"
    RESOLVED_VALID = "resolved_valid"
    RESOLVED_INVALID = "resolved_invalid"
    RESOLVED_PARTIAL = "resolved_partial"


class NotificationType(str, enum.Enum):
    BORROW_REQUEST = "borrow_request"
    BORROW_APPROVED = "borrow_approved"
    BORROW_REJECTED = "borrow_rejected"
    RETURN_REMINDER = "return_reminder"
    RETURN_CONFIRMED = "return_confirmed"
    NEW_REVIEW = "new_review"
    DAMAGE_CLAIM_FILED = "damage_claim_filed"
    DAMAGE_CLAIM_DISPUTED = "damage_claim_disputed"
    DAMAGE_CLAIM_RESOLVED = "damage_claim_resolved"
    PAYMENT_SUCCESS = "payment_success"
    PAYMENT_FAILED = "payment_failed"
    REFUND_ISSUED = "refund_issued"
    COMPLAINT_UPDATE = "complaint_update"
    SYSTEM = "system"


class ComplaintStatus(str, enum.Enum):
    OPEN = "open"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"
