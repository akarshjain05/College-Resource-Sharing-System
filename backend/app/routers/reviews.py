import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.exceptions import NotFoundException, AppException
from app.models.resource import Resource
from app.models.misc import Review, Notification
from app.models.borrow import BorrowRequest
from app.models.enums import BorrowStatus
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

    has_borrowed = (
        db.query(BorrowRequest)
        .filter(
            BorrowRequest.resource_id == resource.id,
            BorrowRequest.borrower_id == current_user.id,
            BorrowRequest.status == BorrowStatus.RETURNED,
        )
        .first()
    )
    if not has_borrowed:
        raise AppException(
            "You can only review resources you have borrowed and returned",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="NOT_ELIGIBLE",
        )

    review = Review(resource_id=resource.id, reviewer_id=current_user.id, rating=payload.rating, comment=payload.comment)
    db.add(review)
    db.commit()

    all_ratings = [r.rating for r in resource.reviews] + [payload.rating]
    resource.average_rating = sum(all_ratings) / len(all_ratings)
    db.commit()
    db.refresh(review)
    return review


@router.get("/resources/{resource_id}/reviews", response_model=list[ReviewResponse])
def list_resource_reviews(resource_id: uuid.UUID, db: Session = Depends(get_db)):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise NotFoundException("Resource not found")
    return resource.reviews


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
