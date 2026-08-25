import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session, joinedload
from fastapi import BackgroundTasks, status

from app.models.borrow import BorrowRequest
from app.models.user import User
from app.models.enums import BorrowStatus, PaymentStatus, DamageClaimStatus
from app.models.damage_claim import DamageClaim
from app.models.payment import Payment
from app.models.wishlist import WishlistItem
from app.core.exceptions import AppException
from app.services import payment_service
from app.services.email_service import send_payment_refund_email
from app.schemas.borrow import BorrowRequestConfirmReturn
from app.models.enums import NotificationType
from app.services.notification_service import create_notification

def _to_date(dt):
    if not dt:
        return None
    if isinstance(dt, str):
        dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
    return dt.date() if isinstance(dt, datetime) else dt

def confirm_return(
    db: Session,
    br: BorrowRequest,
    current_user: User,
    payload: BorrowRequestConfirmReturn,
    background_tasks: BackgroundTasks,
):
    resource = br.resource
    resource_title = resource.title if resource else "item"
    
    lender_reported_damage = bool(payload.damage_report)
    borrower_reported_damage = bool(br.damage_report)
    is_damaged = lender_reported_damage or borrower_reported_damage

    if lender_reported_damage:
        if not payload.damage_evidence_url:
            raise AppException("Photo evidence (damage_evidence_url) is required to file a damage claim", status_code=status.HTTP_400_BAD_REQUEST, error_code="EVIDENCE_REQUIRED")
        
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

    borrower = db.query(User).filter(User.id == br.borrower_id).first()
    if borrower:
        if not is_damaged:
            payment = db.query(Payment).options(joinedload(Payment.payer)).filter(Payment.borrow_request_id == br.id, Payment.status == PaymentStatus.PAID).first()
            if payment and payment.refunded_amount == 0:
                result = payment_service.refund_payment(
                    db, payment, amount_paise=payment.deposit_amount,
                    notes={"reason": "item_returned_undamaged"},
                )
                if payment.payer and payment.payer.email:
                    background_tasks.add_task(
                        send_payment_refund_email,
                        payment.payer.email,
                        payment.payer.full_name,
                        payment.deposit_amount / 100.0,
                        br.resource.title if br.resource else "item",
                        result["id"]
                    )

            actual_ret = _to_date(br.actual_return_date)
            req_end = _to_date(br.requested_end_date)
            if actual_ret and req_end and actual_ret > req_end:
                borrower.trust_score -= 5
            else:
                borrower.trust_score += 2

        if br.borrower_rating is not None:
            rating_adj = {1: -5, 2: -2, 3: 0, 4: +2, 5: +5}
            borrower.trust_score += rating_adj.get(br.borrower_rating, 0)

    if not is_damaged:
        current_user.sharing_score += 10
    
    if br.lender_rating is not None:
        rating_adj = {1: -2, 2: -1, 3: 0, 4: +2, 5: +5}
        current_user.sharing_score += rating_adj.get(br.lender_rating, 0)

    db.commit()

    if is_damaged:
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
        link=f"/my-bookings?id={br.id}",
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
            
    return br
