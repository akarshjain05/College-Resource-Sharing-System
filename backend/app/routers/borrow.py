import uuid
from datetime import date
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
    resource = db.query(Resource).filter(Resource.id == payload.resource_id).first()
    if not resource:
        raise NotFoundException("Resource not found")
    if resource.owner_id == current_user.id:
        raise AppException("You cannot borrow your own resource", status_code=status.HTTP_400_BAD_REQUEST, error_code="SELF_BORROW")
    if resource.quantity_available < 1:
        raise AppException("This resource is currently unavailable", status_code=status.HTTP_400_BAD_REQUEST, error_code="OUT_OF_STOCK")

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


def _get_owned_request(db: Session, request_id: uuid.UUID, lender: User) -> BorrowRequest:
    br = db.query(BorrowRequest).filter(BorrowRequest.id == request_id).first()
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
    br = _get_owned_request(db, request_id, current_user)
    if br.status != BorrowStatus.REQUESTED:
        raise AppException("Only pending requests can be approved", status_code=status.HTTP_400_BAD_REQUEST, error_code="INVALID_STATE")

    br.status = BorrowStatus.APPROVED
    resource = br.resource
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

    br.status = BorrowStatus.DAMAGED if br.damage_report else BorrowStatus.RETURNED
    br.borrower_rating = payload.borrower_rating

    resource = br.resource
    resource.quantity_available += 1
    resource.total_borrows += 1
    resource.status = ResourceStatus.AVAILABLE

    # Trust Score Logic (Borrower)
    borrower = db.query(User).filter(User.id == br.borrower_id).first()
    if borrower:
        if br.status == BorrowStatus.DAMAGED:
            borrower.trust_score -= 20
        else:
            if br.actual_return_date and br.actual_return_date > br.requested_end_date:
                borrower.trust_score -= 5
            else:
                borrower.trust_score += 2

        if br.borrower_rating is not None:
            # e.g., 5 star = +5, 1 star = -5 (linear: rating * 2.5 - 7.5, or simpler map)
            rating_adj = {1: -5, 2: -2, 3: 0, 4: +2, 5: +5}
            borrower.trust_score += rating_adj.get(br.borrower_rating, 0)

    # Sharing Score Logic (Lender)
    if br.status != BorrowStatus.DAMAGED:
        current_user.sharing_score += 10
    
    if br.lender_rating is not None:
        # Bonus for good sharing experience
        rating_adj = {1: -2, 2: -1, 3: 0, 4: +2, 5: +5}
        current_user.sharing_score += rating_adj.get(br.lender_rating, 0)

    db.commit()
    db.refresh(br)

    create_notification(
        db, br.borrower_id, NotificationType.RETURN_CONFIRMED,
        "Return confirmed",
        f"'{resource.title}' return has been confirmed.",
        link=f"/borrow-requests/{br.id}",
    )
    return br
