import uuid
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.exceptions import NotFoundException, ForbiddenException, AppException
from app.models.borrow import BorrowRequest
from app.models.resource import Resource
from app.models.enums import BorrowStatus, ResourceStatus, NotificationType, UserRole
from app.models.user import User
from app.models.wishlist import WishlistItem
from app.schemas.borrow import (
    BorrowRequestCreate,
    BorrowRequestDecision,
    BorrowRequestReturn,
    BorrowRequestConfirmReturn,
    BorrowRequestResponse,
)
from app.services.notification_service import create_notification
from app.services.email_service import send_borrow_request_email

router = APIRouter(prefix="/borrow-requests", tags=["Borrow Requests"])


@router.post("", response_model=BorrowRequestResponse, status_code=status.HTTP_201_CREATED)
def create_borrow_request(
    payload: BorrowRequestCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = db.query(Resource).filter(Resource.id == payload.resource_id).with_for_update().first()
    if not resource:
        raise NotFoundException("Resource not found")
    if resource.owner_id == current_user.id:
        raise AppException("You cannot borrow your own resource", status_code=status.HTTP_400_BAD_REQUEST, error_code="SELF_BORROW")
    if resource.quantity_available < 1:
        raise AppException("This resource is currently unavailable", status_code=status.HTTP_400_BAD_REQUEST, error_code="OUT_OF_STOCK")
        
    requested_days = (payload.requested_end_date - payload.requested_start_date).days
    if requested_days > resource.max_borrow_days:
        raise AppException(f"This resource can only be borrowed for a maximum of {resource.max_borrow_days} days", status_code=status.HTTP_400_BAD_REQUEST, error_code="MAX_DAYS_EXCEEDED")
    if requested_days < 0:
        raise AppException("End date must be after start date", status_code=status.HTTP_400_BAD_REQUEST, error_code="INVALID_DATES")

    borrow_request = BorrowRequest(
        resource_id=resource.id,
        borrower_id=current_user.id,
        lender_id=resource.owner_id,
        requested_start_date=payload.requested_start_date,
        requested_end_date=payload.requested_end_date,
        purpose=payload.purpose,
        deposit_paid=0,
    )
    db.add(borrow_request)
    db.commit()
    db.refresh(borrow_request)

    create_notification(
        db,
        resource.owner_id,
        NotificationType.BORROW_REQUEST,
        "New borrow request",
        f"{current_user.full_name} wants to borrow '{resource.title}'.",
        link=f"/borrow-requests/{borrow_request.id}",
    )
    background_tasks.add_task(
        send_borrow_request_email,
        resource.owner.email,
        resource.owner.full_name,
        current_user.full_name,
        resource.title,
    )
    return borrow_request


@router.get("/my-requests", response_model=list[BorrowRequestResponse])
def my_borrow_requests(status: Optional[BorrowStatus] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(BorrowRequest).filter(BorrowRequest.borrower_id == current_user.id)
    if status:
        query = query.filter(BorrowRequest.status == status)
    return query.all()


@router.get("/incoming", response_model=list[BorrowRequestResponse])
def incoming_borrow_requests(status: Optional[BorrowStatus] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(BorrowRequest).filter(BorrowRequest.lender_id == current_user.id)
    if status:
        query = query.filter(BorrowRequest.status == status)
    return query.all()


def _get_owned_request(db: Session, request_id: uuid.UUID, lender: User, for_update: bool = False) -> BorrowRequest:
    query = db.query(BorrowRequest).filter(BorrowRequest.id == request_id)
    if for_update:
        query = query.with_for_update()
    br = query.first()
    if not br:
        raise NotFoundException("Borrow request not found")
    if br.lender_id != lender.id and lender.role != UserRole.ADMIN:
        raise ForbiddenException("Only the resource owner can perform this action")
    return br


@router.post("/{request_id}/approve", response_model=BorrowRequestResponse)
def approve_borrow_request(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    br = _get_owned_request(db, request_id, current_user, for_update=True)
    if br.status != BorrowStatus.REQUESTED:
        raise AppException("Only pending requests can be approved", status_code=status.HTTP_400_BAD_REQUEST, error_code="INVALID_STATE")

    # Lock resource explicitly to prevent concurrent approvals on the last unit
    resource = db.query(Resource).filter(Resource.id == br.resource_id).with_for_update().first()
    if not resource:
        raise NotFoundException("Resource not found")
    if resource.quantity_available < 1:
        raise AppException("This resource is no longer available", status_code=status.HTTP_409_CONFLICT, error_code="OUT_OF_STOCK")

    br.status = BorrowStatus.APPROVED
    br.decided_at = datetime.now(timezone.utc)

    # Update lender's running average response time
    elapsed = (br.decided_at - br.created_at).total_seconds()
    lender = current_user
    if lender.response_count == 0:
        lender.avg_response_seconds = int(elapsed)
    else:
        lender.avg_response_seconds = int(
            (lender.avg_response_seconds * lender.response_count + elapsed) / (lender.response_count + 1)
        )
    lender.response_count += 1

    resource.quantity_available -= 1
    if resource.quantity_available <= 0:
        resource.status = ResourceStatus.BORROWED
    db.commit()
    db.refresh(br)

    create_notification(
        db, br.borrower_id, NotificationType.BORROW_APPROVED,
        "Borrow request approved",
        f"Your request to borrow '{resource.title}' was approved.",
        link=f"/borrow-requests/{br.id}",
    )
    return br


@router.post("/{request_id}/reject", response_model=BorrowRequestResponse)
def reject_borrow_request(
    request_id: uuid.UUID,
    payload: BorrowRequestDecision,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    br = _get_owned_request(db, request_id, current_user)
    if br.status != BorrowStatus.REQUESTED:
        raise AppException("Only pending requests can be rejected", status_code=status.HTTP_400_BAD_REQUEST, error_code="INVALID_STATE")

    br.status = BorrowStatus.REJECTED
    br.rejection_reason = payload.rejection_reason
    br.decided_at = datetime.now(timezone.utc)

    # Update lender's running average response time
    elapsed = (br.decided_at - br.created_at).total_seconds()
    lender = current_user
    if lender.response_count == 0:
        lender.avg_response_seconds = int(elapsed)
    else:
        lender.avg_response_seconds = int(
            (lender.avg_response_seconds * lender.response_count + elapsed) / (lender.response_count + 1)
        )
    lender.response_count += 1

    db.commit()
    db.refresh(br)

    create_notification(
        db, br.borrower_id, NotificationType.BORROW_REJECTED,
        "Borrow request rejected",
        f"Your request to borrow '{br.resource.title}' was rejected.",
        link=f"/borrow-requests/{br.id}",
    )
    return br


@router.post("/{request_id}/handover", response_model=BorrowRequestResponse)
def handover_resource(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    br = _get_owned_request(db, request_id, current_user)
    if br.status != BorrowStatus.APPROVED:
        raise AppException("Only approved requests can be handed over", status_code=status.HTTP_400_BAD_REQUEST, error_code="INVALID_STATE")

    br.status = BorrowStatus.ACTIVE
    db.commit()
    db.refresh(br)

    create_notification(
        db, br.borrower_id, NotificationType.SYSTEM,
        "Resource Handed Over",
        f"'{br.resource.title}' has been handed over to you.",
        link=f"/borrow-requests/{br.id}",
    )
    return br


@router.post("/{request_id}/cancel", response_model=BorrowRequestResponse)
def cancel_borrow_request(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    br = db.query(BorrowRequest).filter(BorrowRequest.id == request_id).first()
    if not br:
        raise NotFoundException("Borrow request not found")
    if br.borrower_id != current_user.id:
        raise ForbiddenException("Only the borrower can cancel this request")
    if br.status not in (BorrowStatus.REQUESTED, BorrowStatus.APPROVED):
        raise AppException("This request can no longer be cancelled", status_code=status.HTTP_400_BAD_REQUEST, error_code="INVALID_STATE")

    if br.status == BorrowStatus.APPROVED:
        br.resource.quantity_available += 1
        br.resource.status = ResourceStatus.AVAILABLE

    br.status = BorrowStatus.CANCELLED
    db.commit()
    db.refresh(br)
    return br


@router.post("/{request_id}/nudge", status_code=status.HTTP_200_OK)
def nudge_request(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Borrower nudges a pending request to remind the owner to respond."""
    br = db.query(BorrowRequest).filter(BorrowRequest.id == request_id).first()
    if not br:
        raise NotFoundException("Borrow request not found")
    if br.borrower_id != current_user.id:
        raise ForbiddenException("Only the requester can nudge")
    if br.status != BorrowStatus.REQUESTED:
        raise AppException("This request is no longer pending", status_code=status.HTTP_400_BAD_REQUEST, error_code="INVALID_STATE")

    # Rate-limit: one nudge per 24 hours
    if br.last_nudged_at and (datetime.now(timezone.utc) - br.last_nudged_at).total_seconds() < 86400:
        raise AppException("You already nudged this request recently. Try again in 24 hours.", status_code=status.HTTP_429_TOO_MANY_REQUESTS, error_code="NUDGE_COOLDOWN")

    br.last_nudged_at = datetime.now(timezone.utc)
    db.commit()

    create_notification(
        db, br.lender_id, NotificationType.SYSTEM,
        "A borrower is waiting on your response",
        f"{current_user.full_name} is still waiting on your decision for '{br.resource.title}'.",
        link=f"/borrow-requests?tab=incoming",
    )
    return {"detail": "Nudge sent"}

@router.post("/{request_id}/return", response_model=BorrowRequestResponse)
def return_resource(
    request_id: uuid.UUID,
    payload: BorrowRequestReturn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    br = db.query(BorrowRequest).filter(BorrowRequest.id == request_id).first()
    if not br:
        raise NotFoundException("Borrow request not found")
    if br.borrower_id != current_user.id:
        raise ForbiddenException("Only the borrower can mark this as returned")
    if br.status != BorrowStatus.ACTIVE:
        raise AppException("Only active borrows can be returned", status_code=status.HTTP_400_BAD_REQUEST, error_code="INVALID_STATE")

    br.actual_return_date = date.today()
    br.damage_report = payload.damage_report
    br.lender_rating = payload.lender_rating
    br.lender_review = payload.lender_review
    br.status = BorrowStatus.RETURN_REQUESTED

    db.commit()
    db.refresh(br)

    create_notification(
        db, br.lender_id, NotificationType.SYSTEM,
        "Return requested",
        f"{current_user.full_name} has requested to return '{br.resource.title}'. Please confirm receipt.",
        link=f"/borrow-requests/{br.id}",
    )
    return br


@router.post("/{request_id}/confirm-return", response_model=BorrowRequestResponse)
def confirm_return_resource(
    request_id: uuid.UUID,
    payload: BorrowRequestConfirmReturn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    br = _get_owned_request(db, request_id, current_user)
    if br.status != BorrowStatus.RETURN_REQUESTED:
        raise AppException("Only pending returns can be confirmed", status_code=status.HTTP_400_BAD_REQUEST, error_code="INVALID_STATE")

    is_damaged = bool(br.damage_report)
    br.status = BorrowStatus.DAMAGED if is_damaged else BorrowStatus.RETURNED
    br.borrower_rating = payload.borrower_rating
    br.borrower_review = payload.borrower_review

    resource = br.resource
    resource.quantity_available += 1
    resource.total_borrows += 1
    resource.status = ResourceStatus.AVAILABLE

    # Trust Score Logic (Borrower) — damage penalty is DEFERRED to admin adjudication
    borrower = db.query(User).filter(User.id == br.borrower_id).first()
    if borrower:
        if not is_damaged:
            # Only apply normal trust adjustments for non-damaged returns
            if br.actual_return_date and br.actual_return_date > br.requested_end_date:
                borrower.trust_score -= 5
            else:
                borrower.trust_score += 2

        if br.borrower_rating is not None:
            rating_adj = {1: -5, 2: -2, 3: 0, 4: +2, 5: +5}
            borrower.trust_score += rating_adj.get(br.borrower_rating, 0)

    # Sharing Score Logic (Lender)
    if not is_damaged:
        current_user.sharing_score += 10
    
    if br.lender_rating is not None:
        rating_adj = {1: -2, 2: -1, 3: 0, 4: +2, 5: +5}
        current_user.sharing_score += rating_adj.get(br.lender_rating, 0)

    db.commit()
    db.refresh(br)

    # If damaged, auto-create a DamageClaim for admin adjudication
    if is_damaged:
        from app.models.damage_claim import DamageClaim
        from app.models.enums import DamageClaimStatus

        claim = DamageClaim(
            borrow_request_id=br.id,
            filed_by_id=current_user.id,
            against_user_id=br.borrower_id,
            description=br.damage_report,
            status=DamageClaimStatus.OPEN,
        )
        db.add(claim)
        db.commit()
        db.refresh(claim)

        # Notify borrower about the damage claim
        create_notification(
            db, br.borrower_id, NotificationType.SYSTEM,
            "Damage claim filed",
            f"A damage claim has been filed for '{resource.title}'. You can dispute it within your dashboard.",
            link=f"/damage-claims/{claim.id}",
        )

    create_notification(
        db, br.borrower_id, NotificationType.RETURN_CONFIRMED,
        "Return confirmed",
        f"'{resource.title}' return has been confirmed.",
        link=f"/borrow-requests/{br.id}",
    )

    # Notify wishlisters that the resource is available again
    wishlisters = db.query(WishlistItem).filter(WishlistItem.resource_id == resource.id).all()
    for item in wishlisters:
        create_notification(
            db, item.user_id, NotificationType.SYSTEM,
            "Wishlist item available",
            f"An item on your wishlist, '{resource.title}', is now available to borrow!",
            link=f"/resources/{resource.id}",
        )

    return br

