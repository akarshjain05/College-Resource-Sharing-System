from datetime import date
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.borrow import BorrowRequest
from app.models.enums import BorrowStatus
from app.models.resource import Resource

def is_resource_available_for_dates(
    db: Session, 
    resource_id: uuid.UUID, 
    start_date: date, 
    end_date: date, 
    total_quantity: int
) -> bool:
    """
    Checks if a resource has enough quantity available for the requested date range.
    Instead of checking a mutating `quantity_available` field, this evaluates overlap.
    """
    if total_quantity <= 0:
        return False
        
    blocking_statuses = [BorrowStatus.APPROVED, BorrowStatus.ACTIVE, BorrowStatus.RETURN_REQUESTED, BorrowStatus.LATE]
    
    # We find how many approved/active items overlap with this date range
    # A request overlaps if it starts on or before our end date, and ends on or after our start date.
    overlapping_count = (
        db.query(func.count(BorrowRequest.id))
        .filter(BorrowRequest.resource_id == resource_id)
        .filter(BorrowRequest.status.in_(blocking_statuses))
        .filter(BorrowRequest.requested_start_date <= end_date)
        .filter(BorrowRequest.requested_end_date >= start_date)
        .scalar()
    )
    
    # Check if the number of currently blocked items is less than the total stock
    return (overlapping_count or 0) < total_quantity

def get_blocked_dates(db: Session, resource_id: uuid.UUID):
    """
    Gets the raw blocked bookings for a resource, used for availability calendars.
    Note: For multi-quantity items, this would ideally return dates only when ALL quantities are booked.
    Currently, we return all bookings to the calendar for simplicity.
    """
    blocking_statuses = [BorrowStatus.APPROVED, BorrowStatus.ACTIVE, BorrowStatus.RETURN_REQUESTED, BorrowStatus.LATE]
    
    bookings = (
        db.query(BorrowRequest.requested_start_date, BorrowRequest.requested_end_date, BorrowRequest.status)
        .filter(BorrowRequest.resource_id == resource_id)
        .filter(BorrowRequest.status.in_(blocking_statuses))
        .all()
    )
    
    return [
        {"start": b.requested_start_date, "end": b.requested_end_date, "status": b.status}
        for b in bookings
    ]
