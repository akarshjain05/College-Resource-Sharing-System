import uuid
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Request, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.exceptions import NotFoundException, ForbiddenException, AppException
from app.core.rate_limit import limiter
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
from app.services.availability import is_resource_available_for_dates

router = APIRouter(prefix="/borrow-requests", tags=["Borrow Requests"])


def _borrow_query(db: Session):
    """Helper to construct Eager-Loaded BorrowRequest query."""
    return db.query(BorrowRequest).options(
        joinedload(BorrowRequest.resource).joinedload(Resource.category),
        joinedload(BorrowRequest.resource).joinedload(Resource.owner),
        joinedload(BorrowRequest.borrower),
        joinedload(BorrowRequest.lender),
    )


def _to_date(val) -> Optional[date]:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.date()
    return val


@router.post("", response_model=BorrowRequestResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def create_borrow_request(
    request: Request,
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
    if not is_resource_available_for_dates(
        db, 
        resource.id, 
        payload.requested_start_date, 
        payload.requested_end_date, 
        resource.quantity_available
    ):
        raise AppException("Those dates overlap an existing approved borrow", status_code=status.HTTP_400_BAD_REQUEST, error_code="DATE_CONFLICT")
        
    # Check if borrower already has an overlapping active/pending request
    overlapping_br = (
        db.query(BorrowRequest)
        .filter(
            BorrowRequest.resource_id == resource.id,
            BorrowRequest.borrower_id == current_user.id,
            BorrowRequest.status.in_([
                BorrowStatus.REQUESTED,
                BorrowStatus.APPROVED,
                BorrowStatus.HANDOVER_REQUESTED,
                BorrowStatus.ACTIVE,
                BorrowStatus.RETURN_REQUESTED,
                BorrowStatus.LATE
            ]),
            BorrowRequest.requested_start_date <= payload.requested_end_date,
            BorrowRequest.requested_end_date >= payload.requested_start_date,
        )
        .first()
    )
    if overlapping_br:
        raise AppException(
            "You already have an active or pending request for this item during these dates",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="DUPLICATE_REQUEST"
        )

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

    resource_title = resource.title
    owner_email = resource.owner.email if resource.owner else None
    owner_name = resource.owner.full_name if resource.owner else "Owner"

    create_notification(
        db,
        resource.owner_id,
        NotificationType.BORROW_REQUEST,
        "New borrow request",
        f"{current_user.full_name} wants to borrow '{resource_title}'.",
        link=f"/borrow-requests/{borrow_request.id}",
    )
    return _borrow_query(db).filter(BorrowRequest.id == borrow_request.id).first()


@router.get("/my-requests", response_model=list[BorrowRequestResponse])
def my_borrow_requests(status: Optional[BorrowStatus] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = _borrow_query(db).filter(BorrowRequest.borrower_id == current_user.id)
    if status:
        query = query.filter(BorrowRequest.status == status)
    results = query.all()
    # Filter out orphaned records where relationship objects might be missing
    return [r for r in results if r.resource is not None and r.borrower is not None and r.lender is not None]


@router.get("/incoming", response_model=list[BorrowRequestResponse])
def incoming_borrow_requests(status: Optional[BorrowStatus] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = _borrow_query(db).filter(BorrowRequest.lender_id == current_user.id)
    if status:
        query = query.filter(BorrowRequest.status == status)
    results = query.all()
    # Filter out orphaned records where relationship objects might be missing
    return [r for r in results if r.resource is not None and r.borrower is not None and r.lender is not None]


def _get_owned_request(db: Session, request_id: uuid.UUID, lender: User, for_update: bool = False) -> BorrowRequest:
    if for_update:
        query = db.query(BorrowRequest).filter(BorrowRequest.id == request_id)
    else:
        query = _borrow_query(db).filter(BorrowRequest.id == request_id)
        
    if lender.role != UserRole.ADMIN:
        query = query.filter(BorrowRequest.lender_id == lender.id)
        
    if for_update:
        query = query.with_for_update()
        
    br = query.first()
    if not br:
        raise NotFoundException("Borrow request not found")
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
    
    if br.requested_end_date and date.today() > _to_date(br.requested_end_date):
        raise AppException("Cannot approve a request whose lending window has already expired", status_code=status.HTTP_400_BAD_REQUEST, error_code="INVALID_DATE")

    # Lock resource explicitly to prevent concurrent approvals
    resource = db.query(Resource).filter(Resource.id == br.resource_id).with_for_update().first()
    if not resource:
        raise NotFoundException("Resource not found")
        
    if not is_resource_available_for_dates(
        db, 
        resource.id, 
        br.requested_start_date, 
        br.requested_end_date, 
        resource.quantity
    ):
        raise AppException("This resource is no longer available for the requested dates", status_code=status.HTTP_409_CONFLICT, error_code="DATE_CONFLICT")

    resource_title = resource.title

    br.status = BorrowStatus.APPROVED
    br.decided_at = datetime.now(timezone.utc)
    db.flush()

    decided = br.decided_at.replace(tzinfo=None) if br.decided_at and br.decided_at.tzinfo else br.decided_at
    created = br.created_at.replace(tzinfo=None) if br.created_at and br.created_at.tzinfo else br.created_at
    elapsed = (decided - created).total_seconds() if (decided and created) else 0.0

    lender = current_user
    rc = lender.response_count or 0
    avg_sec = lender.avg_response_seconds or 0
    if rc == 0:
        lender.avg_response_seconds = int(elapsed)
    else:
        lender.avg_response_seconds = int(
            (avg_sec * rc + elapsed) / (rc + 1)
        )
    lender.response_count = rc + 1

    # Auto-decline any remaining pending requests for this resource that overlap
    other_pending_requests = (
        db.query(BorrowRequest)
        .filter(
            BorrowRequest.resource_id == resource.id,
            BorrowRequest.id != br.id,
            BorrowRequest.status == BorrowStatus.REQUESTED,
        )
        .all()
    )

    for other_br in other_pending_requests:
        if not is_resource_available_for_dates(
            db, resource.id, other_br.requested_start_date, other_br.requested_end_date, resource.quantity
        ):
            other_br.status = BorrowStatus.REJECTED
            other_br.rejection_reason = "Resource is no longer available (approved for another borrower)."
            create_notification(
                db,
                other_br.borrower_id,
                NotificationType.BORROW_REJECTED,
                "Borrow Request Auto-Declined",
                f"Your request to borrow '{resource.title}' was automatically declined because the item was approved for another borrower.",
                link=f"/borrow-requests/{other_br.id}",
            )

    db.commit()

    create_notification(
        db, br.borrower_id, NotificationType.BORROW_APPROVED,
        "Borrow request approved",
        f"Your request to borrow '{resource_title}' was approved.",
        link=f"/borrow-requests/{br.id}",
    )
    return _borrow_query(db).filter(BorrowRequest.id == br.id).first()


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

    resource_title = br.resource.title if br.resource else "item"

    br.status = BorrowStatus.REJECTED
    br.rejection_reason = payload.rejection_reason
    br.decided_at = datetime.now(timezone.utc)

    decided = br.decided_at.replace(tzinfo=None) if br.decided_at and br.decided_at.tzinfo else br.decided_at
    created = br.created_at.replace(tzinfo=None) if br.created_at and br.created_at.tzinfo else br.created_at
    elapsed = (decided - created).total_seconds() if (decided and created) else 0.0

    lender = current_user
    rc = lender.response_count or 0
    avg_sec = lender.avg_response_seconds or 0
    if rc == 0:
        lender.avg_response_seconds = int(elapsed)
    else:
        lender.avg_response_seconds = int(
            (avg_sec * rc + elapsed) / (rc + 1)
        )
    lender.response_count = rc + 1

    db.commit()

    create_notification(
        db, br.borrower_id, NotificationType.BORROW_REJECTED,
        "Borrow request rejected",
        f"Your request to borrow '{resource_title}' was rejected.",
        link=f"/borrow-requests/{br.id}",
    )
    return _borrow_query(db).filter(BorrowRequest.id == br.id).first()


@router.post("/{request_id}/handover", response_model=BorrowRequestResponse)
def handover_resource(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    br = _get_owned_request(db, request_id, current_user)
    if br.status not in (BorrowStatus.APPROVED, BorrowStatus.HANDOVER_REQUESTED):
        raise AppException("Only approved requests can be handed over", status_code=status.HTTP_400_BAD_REQUEST, error_code="INVALID_STATE")
    
    from app.models.payment import Payment
    from app.models.enums import PaymentStatus
    
    if br.resource and getattr(br.resource, "deposit_amount", 0) and float(br.resource.deposit_amount) > 0:
        payment = db.query(Payment).filter(Payment.borrow_request_id == br.id).first()
        if not payment or payment.status != PaymentStatus.PAID:
            raise AppException(
                "Borrower must complete payment before handover",
                status_code=status.HTTP_400_BAD_REQUEST, error_code="PAYMENT_REQUIRED",
            )

    br.status = BorrowStatus.HANDOVER_REQUESTED
    db.commit()

    create_notification(
        db, br.borrower_id, NotificationType.SYSTEM,
        "Handover Pending Confirmation",
        f"'{br.resource.title if br.resource else 'item'}' has been handed over by the lender. Please confirm receipt.",
        link=f"/borrow-requests/{br.id}",
    )
    return _borrow_query(db).filter(BorrowRequest.id == br.id).first()


@router.post("/{request_id}/confirm-handover", response_model=BorrowRequestResponse)
def confirm_handover_resource(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(BorrowRequest).filter(BorrowRequest.id == request_id)
    if current_user.role != UserRole.ADMIN:
        query = query.filter(BorrowRequest.borrower_id == current_user.id)
    br = query.first()
    if not br:
        raise NotFoundException("Borrow request not found")
    if br.status != BorrowStatus.HANDOVER_REQUESTED:
        raise AppException("Only pending handovers can be confirmed", status_code=status.HTTP_400_BAD_REQUEST, error_code="INVALID_STATE")

    br.status = BorrowStatus.ACTIVE
    db.commit()
    db.refresh(br)

    resource_title = br.resource.title if br.resource else "item"

    create_notification(
        db, br.lender_id, NotificationType.SYSTEM,
        "Handover Confirmed",
        f"'{resource_title}' handover was confirmed by {current_user.full_name}.",
        link=f"/borrow-requests/{br.id}",
    )
    return _borrow_query(db).filter(BorrowRequest.id == br.id).first()


@router.post("/{request_id}/reject-handover", response_model=BorrowRequestResponse)
def reject_handover_resource(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Borrower reports not receiving an item marked as handed over."""
    query = db.query(BorrowRequest).filter(BorrowRequest.id == request_id)
    if current_user.role != UserRole.ADMIN:
        query = query.filter(BorrowRequest.borrower_id == current_user.id)
    br = query.first()
    if not br:
        raise NotFoundException("Borrow request not found")
    if br.status != BorrowStatus.HANDOVER_REQUESTED:
        raise AppException("Only pending handovers can be rejected", status_code=status.HTTP_400_BAD_REQUEST, error_code="INVALID_STATE")

    from app.models.payment import Payment
    from app.models.enums import PaymentStatus
    from app.services import payment_service

    payment = db.query(Payment).filter(Payment.borrow_request_id == br.id, Payment.status == PaymentStatus.PAID).first()
    if payment:
        result = payment_service.refund_payment(
            payment.razorpay_payment_id, amount_paise=payment.total_amount,
            notes={"reason": "borrower_rejected_handover_cancelled"},
        )
        payment.status = PaymentStatus.REFUND_INITIATED
        payment.refund_id = result["id"]

    br.status = BorrowStatus.CANCELLED
    db.commit()
    db.refresh(br)

    create_notification(
        db, br.lender_id, NotificationType.SYSTEM,
        "Handover Rejected / Booking Cancelled",
        f"'{br.resource.title if br.resource else 'item'}' handover was rejected by {current_user.full_name} (reported not received). The booking has been cancelled and refunded.",
        link=f"/borrow-requests/{br.id}",
    )
    return _borrow_query(db).filter(BorrowRequest.id == br.id).first()


@router.post("/{request_id}/cancel", response_model=BorrowRequestResponse)
def cancel_borrow_request(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = _borrow_query(db).filter(BorrowRequest.id == request_id)
    if current_user.role != UserRole.ADMIN:
        from sqlalchemy import or_
        query = query.filter(
            or_(
                BorrowRequest.borrower_id == current_user.id,
                BorrowRequest.lender_id == current_user.id
            )
        )
    br = query.first()
    if not br:
        raise NotFoundException("Borrow request not found")
    if br.status not in (BorrowStatus.REQUESTED, BorrowStatus.APPROVED):
        raise AppException("This request can no longer be cancelled", status_code=status.HTTP_400_BAD_REQUEST, error_code="INVALID_STATE")

    was_approved = br.status == BorrowStatus.APPROVED
    resource_title = br.resource.title if br.resource else "item"
    lender_id = br.lender_id
    req_id = br.id

    from app.models.payment import Payment
    from app.models.enums import PaymentStatus
    from app.services import payment_service

    payment = db.query(Payment).filter(Payment.borrow_request_id == br.id, Payment.status == PaymentStatus.PAID).first()
    if payment:
        result = payment_service.refund_payment(
            payment.razorpay_payment_id, amount_paise=payment.total_amount,
            notes={"reason": "borrow_request_cancelled"},
        )
        payment.status = PaymentStatus.REFUND_INITIATED
        payment.refund_id = result["id"]

    br.status = BorrowStatus.CANCELLED
    db.commit()

    status_text = "approved borrow request" if was_approved else "borrow request"
    notify_user_id = br.borrower_id if current_user.id == lender_id else lender_id
    
    create_notification(
        db,
        notify_user_id,
        NotificationType.SYSTEM,
        "Borrow request cancelled",
        f"{current_user.full_name} cancelled the {status_text} for '{resource_title}'.",
        link=f"/borrow-requests/{req_id}?tab={'lending' if notify_user_id == lender_id else 'borrowing'}",
    )

    return _borrow_query(db).filter(BorrowRequest.id == req_id).first()


@router.post("/{request_id}/nudge", status_code=status.HTTP_200_OK)
def nudge_request(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Borrower nudges a request to remind the owner to respond or hand over the item."""
    query = _borrow_query(db).filter(BorrowRequest.id == request_id)
    if current_user.role != UserRole.ADMIN:
        query = query.filter(BorrowRequest.borrower_id == current_user.id)
    br = query.first()
    if not br:
        raise NotFoundException("Borrow request not found")
    if br.status not in (BorrowStatus.REQUESTED, BorrowStatus.APPROVED):
        raise AppException("This request cannot be nudged", status_code=status.HTTP_400_BAD_REQUEST, error_code="INVALID_STATE")

    # Rate-limit: one nudge per 24 hours
    if br.last_nudged_at and (datetime.now(timezone.utc) - br.last_nudged_at).total_seconds() < 86400:
        raise AppException("You already nudged this request recently. Try again in 24 hours.", status_code=status.HTTP_429_TOO_MANY_REQUESTS, error_code="NUDGE_COOLDOWN")

    resource_title = br.resource.title if br.resource else "item"
    br.last_nudged_at = datetime.now(timezone.utc)
    db.commit()

    if br.status == BorrowStatus.APPROVED:
        notif_title = "Borrower is waiting for handover"
        notif_msg = f"{current_user.full_name} is waiting for handover of '{resource_title}'. Please mark as handed over when delivered."
    else:
        notif_title = "A borrower is waiting on your response"
        notif_msg = f"{current_user.full_name} is still waiting on your decision for '{resource_title}'."

    create_notification(
        db, br.lender_id, NotificationType.SYSTEM,
        notif_title,
        notif_msg,
        link=f"/borrow-requests/{br.id}",
    )
    return {"detail": "Nudge sent"}


@router.post("/{request_id}/return", response_model=BorrowRequestResponse)
def return_resource(
    request_id: uuid.UUID,
    payload: BorrowRequestReturn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = _borrow_query(db).filter(BorrowRequest.id == request_id)
    if current_user.role != UserRole.ADMIN:
        query = query.filter(BorrowRequest.borrower_id == current_user.id)
    br = query.first()
    if not br:
        raise NotFoundException("Borrow request not found")
    if br.status not in (BorrowStatus.ACTIVE, BorrowStatus.LATE):
        raise AppException("Only active or late borrows can be returned", status_code=status.HTTP_400_BAD_REQUEST, error_code="INVALID_STATE")

    if br.requested_start_date and date.today() < _to_date(br.requested_start_date):
        raise AppException("Cannot return resource before the requested start date", status_code=status.HTTP_400_BAD_REQUEST, error_code="INVALID_DATE")

    resource_title = br.resource.title if br.resource else "item"
    br.actual_return_date = datetime.now(timezone.utc)
    br.damage_report = payload.damage_report
    br.lender_rating = payload.lender_rating
    br.lender_review = payload.lender_review
    br.status = BorrowStatus.RETURN_REQUESTED

    db.commit()

    create_notification(
        db, br.lender_id, NotificationType.SYSTEM,
        "Return requested",
        f"{current_user.full_name} has requested to return '{resource_title}'. Please confirm receipt.",
        link=f"/borrow-requests/{br.id}",
    )
    return _borrow_query(db).filter(BorrowRequest.id == br.id).first()


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

    resource = br.resource
    resource_title = resource.title if resource else "item"

    # A damage claim can be initiated by the borrower's report OR the lender's report
    lender_reported_damage = bool(payload.damage_report)
    borrower_reported_damage = bool(br.damage_report)
    is_damaged = lender_reported_damage or borrower_reported_damage

    if lender_reported_damage:
        if not payload.damage_evidence_url:
            raise AppException("Photo evidence (damage_evidence_url) is required to file a damage claim", status_code=status.HTTP_400_BAD_REQUEST, error_code="EVIDENCE_REQUIRED")
        
        # Rate-limit checks: max 2 claims against the same borrower in 30 days
        from datetime import timedelta
        from app.models.damage_claim import DamageClaim
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        recent_claims = db.query(DamageClaim).filter(
            DamageClaim.filed_by_id == current_user.id,
            DamageClaim.against_user_id == br.borrower_id,
            DamageClaim.created_at >= thirty_days_ago
        ).count()
        if recent_claims >= 2:
            raise AppException("You have filed too many recent damage claims against this user. Please contact support.", status_code=status.HTTP_429_TOO_MANY_REQUESTS, error_code="RATE_LIMIT_EXCEEDED")

    br.status = BorrowStatus.DAMAGED if is_damaged else BorrowStatus.RETURNED
    br.borrower_rating = payload.borrower_rating
    br.borrower_review = payload.borrower_review

    if resource:
        resource.total_borrows += 1

    # Trust Score Logic (Borrower)
    borrower = db.query(User).filter(User.id == br.borrower_id).first()
    if borrower:
        if not is_damaged:
            from app.models.payment import Payment
            from app.models.enums import PaymentStatus
            from app.services import payment_service

            payment = db.query(Payment).filter(Payment.borrow_request_id == br.id, Payment.status == PaymentStatus.PAID).first()
            if payment and payment.refunded_amount == 0:
                result = payment_service.refund_payment(
                    payment.razorpay_payment_id, amount_paise=payment.deposit_amount,
                    notes={"reason": "security_deposit_return"},
                )
                payment.status = PaymentStatus.REFUND_INITIATED
                payment.refund_id = result["id"]

            # Only apply normal trust adjustments for non-damaged returns
            actual_ret = _to_date(br.actual_return_date)
            req_end = _to_date(br.requested_end_date)
            if actual_ret and req_end and actual_ret > req_end:
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

    # If damaged, auto-create a DamageClaim for admin adjudication
    if is_damaged:
        from app.models.damage_claim import DamageClaim
        from app.models.enums import DamageClaimStatus

        claim = DamageClaim(
            borrow_request_id=br.id,
            filed_by_id=current_user.id,
            against_user_id=br.borrower_id,
            description=payload.damage_report or br.damage_report,
            damage_evidence_url=payload.damage_evidence_url,
            status=DamageClaimStatus.OPEN,
        )
        db.add(claim)
        db.commit()

        create_notification(
            db, br.borrower_id, NotificationType.SYSTEM,
            "Damage claim filed",
            f"A damage claim has been filed for '{resource_title}'. You can dispute it within your dashboard.",
            link=f"/damage-claims/{claim.id}",
        )

    create_notification(
        db, br.borrower_id, NotificationType.RETURN_CONFIRMED,
        "Return confirmed",
        f"'{resource_title}' return has been confirmed.",
        link=f"/borrow-requests/{br.id}",
    )

    if resource:
        wishlisters = db.query(WishlistItem).filter(WishlistItem.resource_id == resource.id).limit(100).all()
        for item in wishlisters:
            create_notification(
                db, item.user_id, NotificationType.SYSTEM,
                "Wishlist item available",
                f"An item on your wishlist, '{resource_title}', is now available to borrow!",
                link=f"/resources/{resource.id}",
            )

    return _borrow_query(db).filter(BorrowRequest.id == br.id).first()