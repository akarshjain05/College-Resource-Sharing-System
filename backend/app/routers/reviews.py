import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.exceptions import NotFoundException, AppException, ForbiddenException
from app.models.resource import Resource
from app.models.misc import Review, Notification
from app.models.borrow import BorrowRequest
from app.models.enums import BorrowStatus, UserRole
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewResponse, NotificationResponse

router = APIRouter(tags=["Reviews & Notifications"])


@router.post("/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    payload: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = db.query(Resource).filter(Resource.id == payload.resource_id).first()
    if not resource:
        raise NotFoundException("Resource not found")

    # Ensure the borrow request belongs to the user and resource, and is completed
    borrow_request = (
        db.query(BorrowRequest)
        .filter(
            BorrowRequest.id == payload.borrow_request_id,
            BorrowRequest.resource_id == resource.id,
            BorrowRequest.borrower_id == current_user.id,
            BorrowRequest.status.in_([BorrowStatus.RETURNED, BorrowStatus.DAMAGED]),
        )
        .first()
    )
    if not borrow_request:
        raise AppException(
            "You can only review a resource after successfully borrowing it (invalid or incomplete borrow request)",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="NOT_ELIGIBLE",
        )

    # Check if a review already exists for this borrow request by this user
    existing_review = (
        db.query(Review)
        .filter(
            Review.borrow_request_id == payload.borrow_request_id,
            Review.reviewer_id == current_user.id,
        )
        .first()
    )
    if existing_review:
        raise AppException(
            "You have already reviewed this borrow transaction",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="ALREADY_REVIEWED",
        )

    review = Review(
        resource_id=resource.id,
        borrow_request_id=payload.borrow_request_id,
        reviewer_id=current_user.id,
        rating=payload.rating,
        comment=payload.comment
    )
    db.add(review)
    db.commit()

    from sqlalchemy import func
    avg_rating = db.query(func.avg(Review.rating)).filter(Review.resource_id == resource.id).scalar()
    resource.average_rating = float(avg_rating) if avg_rating is not None else 0.0
    db.commit()
    db.refresh(review)
    return review


@router.get("/resources/{resource_id}/reviews", response_model=list[ReviewResponse])
def list_resource_reviews(resource_id: uuid.UUID, db: Session = Depends(get_db)):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise NotFoundException("Resource not found")
    return resource.reviews


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(
    review_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin-only: permanently remove a review and recalculate the resource rating."""
    if current_user.role != UserRole.ADMIN:
        raise ForbiddenException("Only admins can delete reviews")

    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise NotFoundException("Review not found")

    resource = review.resource
    db.delete(review)
    db.flush()  # apply deletion before recomputing

    # Recompute average rating from remaining reviews
    from sqlalchemy import func
    avg_rating = db.query(func.avg(Review.rating)).filter(Review.resource_id == resource.id).scalar()
    resource.average_rating = float(avg_rating) if avg_rating is not None else 0.0

    db.commit()
    return None


@router.get("/notifications", response_model=list[NotificationResponse])
def list_my_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )


@router.post("/notifications/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not notif:
        raise NotFoundException("Notification not found")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.post("/notifications/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_notifications_read(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).update(
        {"is_read": True}
    )
    db.commit()
    return None


@router.delete("/notifications/clear-all", status_code=status.HTTP_204_NO_CONTENT)
def clear_all_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == current_user.id).delete()
    db.commit()
    return None

@router.get("/notifications/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import select, func
    from app.models.misc import Notification
    count = db.execute(
        select(func.count(Notification.id))
        .where(Notification.user_id == current_user.id)
        .where(Notification.is_read == False)
    ).scalar_one()
    return {"unread_count": count}
