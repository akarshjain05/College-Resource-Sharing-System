"""
Damage Claims router — dispute/adjudication flow for damage reports.

Lifecycle:
  1. Lender confirms return with damage → DamageClaim auto-created (OPEN)
  2. Borrower can POST /dispute → status moves to DISPUTED
  3. Admin reviews and POST /resolve → status moves to RESOLVED_*
     Trust penalty is applied only at this stage.
"""
import uuid

from fastapi import APIRouter, Depends, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.core.exceptions import NotFoundException, ForbiddenException, AppException
from app.models.damage_claim import DamageClaim
from app.models.user import User
from app.models.enums import DamageClaimStatus, NotificationType
from app.schemas.damage_claim import DamageClaimDispute, DamageClaimResolve, DamageClaimResponse
from app.services.notification_service import create_notification

router = APIRouter(prefix="/damage-claims", tags=["Damage Claims"])


@router.get("/my-claims", response_model=list[DamageClaimResponse])
def my_damage_claims(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List damage claims filed against the current user (borrower view)."""
    return (
        db.query(DamageClaim)
        .filter(DamageClaim.against_user_id == current_user.id)
        .order_by(DamageClaim.created_at.desc())
        .all()
    )


@router.get("/filed", response_model=list[DamageClaimResponse])
def filed_damage_claims(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List damage claims filed by the current user (lender view)."""
    return (
        db.query(DamageClaim)
        .filter(DamageClaim.filed_by_id == current_user.id)
        .order_by(DamageClaim.created_at.desc())
        .all()
    )


@router.get("/{claim_id}", response_model=DamageClaimResponse)
def get_damage_claim(
    claim_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single damage claim. Accessible by the lender, borrower, or admin."""
    claim = db.query(DamageClaim).filter(DamageClaim.id == claim_id).first()
    if not claim:
        raise NotFoundException("Damage claim not found")
    if (
        claim.filed_by_id != current_user.id
        and claim.against_user_id != current_user.id
        and current_user.role.value != "admin"
    ):
        raise ForbiddenException("You do not have access to this damage claim")
    return claim


@router.post("/{claim_id}/dispute", response_model=DamageClaimResponse)
def dispute_damage_claim(
    claim_id: uuid.UUID,
    payload: DamageClaimDispute,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Borrower disputes a damage claim filed against them."""
    claim = db.query(DamageClaim).filter(DamageClaim.id == claim_id).first()
    if not claim:
        raise NotFoundException("Damage claim not found")
    if claim.against_user_id != current_user.id:
        raise ForbiddenException("Only the accused borrower can dispute this claim")
    if claim.status != DamageClaimStatus.OPEN:
        raise AppException(
            "This claim can no longer be disputed",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INVALID_STATE",
        )

    claim.dispute_reason = payload.dispute_reason
    claim.status = DamageClaimStatus.DISPUTED
    db.commit()
    db.refresh(claim)

    # Notify the lender that their claim has been disputed
    create_notification(
        db,
        claim.filed_by_id,
        NotificationType.DAMAGE_CLAIM_DISPUTED,
        "Damage claim disputed",
        f"The borrower has disputed your damage claim. An admin will review it.",
        link=f"/damage-claims/{claim.id}",
    )

    return claim


@router.get("", response_model=list[DamageClaimResponse])
def list_all_damage_claims(
    status_filter: DamageClaimStatus | None = None,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Admin: list all damage claims, optionally filtered by status."""
    query = db.query(DamageClaim)
    if status_filter:
        query = query.filter(DamageClaim.status == status_filter)
    return query.order_by(DamageClaim.created_at.desc()).all()


@router.post("/{claim_id}/resolve", response_model=DamageClaimResponse)
def resolve_damage_claim(
    claim_id: uuid.UUID,
    payload: DamageClaimResolve,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Admin resolves a damage claim with a final verdict and optional trust penalty."""
    claim = db.query(DamageClaim).filter(DamageClaim.id == claim_id).first()
    if not claim:
        raise NotFoundException("Damage claim not found")
    if claim.status not in (DamageClaimStatus.OPEN, DamageClaimStatus.DISPUTED):
        raise AppException(
            "This claim has already been resolved",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="ALREADY_RESOLVED",
        )

    # Validate the resolution status
    valid_resolutions = {
        DamageClaimStatus.RESOLVED_VALID,
        DamageClaimStatus.RESOLVED_INVALID,
        DamageClaimStatus.RESOLVED_PARTIAL,
    }
    if payload.status not in valid_resolutions:
        raise AppException(
            "Resolution status must be one of: resolved_valid, resolved_invalid, resolved_partial",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INVALID_RESOLUTION_STATUS",
        )

    claim.status = payload.status
    claim.admin_resolution = payload.admin_resolution
    claim.final_cost = payload.final_cost
    claim.trust_penalty_applied = payload.trust_penalty

    # Apply trust penalty to the borrower only now, after admin review
    if payload.trust_penalty > 0:
        borrower = db.query(User).filter(User.id == claim.against_user_id).first()
        if borrower:
            borrower.trust_score -= payload.trust_penalty

    # The security deposit was captured (not refunded) as soon as the lender reported
    # damage — it's been sitting held ever since. The admin's verdict is what finally
    # decides how much of it, if any, actually goes back to the borrower.
    from app.models.borrow import BorrowRequest
    from app.models.enums import BorrowStatus, PaymentStatus
    from app.models.payment import Payment
    from app.services import payment_service
    from app.services.email_service import send_payment_refund_email
    from sqlalchemy.orm import joinedload

    br = db.query(BorrowRequest).filter(BorrowRequest.id == claim.borrow_request_id).first()
    payment = None
    if br:
        payment = (
            db.query(Payment)
            .options(joinedload(Payment.payer))
            .filter(Payment.borrow_request_id == br.id, Payment.status == PaymentStatus.PAID)
            .first()
        )

    if payload.status == DamageClaimStatus.RESOLVED_INVALID:
        # Borrower was innocent — restore their reputation by clearing the DAMAGED
        # status, and release the full deposit back to them.
        if br and br.status == BorrowStatus.DAMAGED:
            br.status = BorrowStatus.RETURNED

        if payment and (payment.refunded_amount or 0) == 0 and payment.deposit_amount > 0:
            result = payment_service.refund_payment(
                db, payment.payer, payment.razorpay_payment_id,
                amount_paise=payment.deposit_amount,
                notes={"reason": "damage_claim_resolved_invalid", "claim_id": str(claim.id)},
            )
            payment.status = PaymentStatus.REFUND_INITIATED
            payment.refund_id = result["id"]
            if payment.payer and payment.payer.email:
                background_tasks.add_task(
                    send_payment_refund_email,
                    payment.payer.email,
                    payment.payer.full_name,
                    payment.deposit_amount / 100.0,
                    br.resource.title if br.resource else "item",
                    result["id"]
                )

    elif payload.status == DamageClaimStatus.RESOLVED_PARTIAL:
        # Borrower is only partly at fault — the assessed cost is kept out of the
        # deposit, and whatever remains is refunded back to them.
        if payment and (payment.refunded_amount or 0) == 0:
            final_cost_paise = int(round((payload.final_cost or 0) * 100))
            refundable_paise = max(0, payment.deposit_amount - final_cost_paise)
            
            # Credit the kept portion to the lender's wallet as compensation
            if final_cost_paise > 0:
                from app.models.wallet import WalletTransaction
                from app.models.enums import WalletTransactionType
                lender = db.query(User).filter(User.id == claim.filed_by_id).first()
                if lender:
                    lender.wallet_balance += final_cost_paise
                    comp_tx = WalletTransaction(
                        user_id=lender.id,
                        amount=final_cost_paise,
                        type=WalletTransactionType.EARNING,
                        reference_id=str(claim.id)
                    )
                    db.add(comp_tx)
            
            if refundable_paise > 0:
                result = payment_service.refund_payment(
                    db, payment.payer, payment.razorpay_payment_id,
                    amount_paise=refundable_paise,
                    notes={"reason": "damage_claim_resolved_partial", "claim_id": str(claim.id)},
                )
                payment.status = PaymentStatus.REFUND_INITIATED
                payment.refund_id = result["id"]
                if payment.payer and payment.payer.email:
                    background_tasks.add_task(
                        send_payment_refund_email,
                        payment.payer.email,
                        payment.payer.full_name,
                        refundable_paise / 100.0,
                        br.resource.title if br.resource else "item",
                        result["id"]
                    )

    elif payload.status == DamageClaimStatus.RESOLVED_VALID:
        # RESOLVED_VALID: the lender's claim stands as filed — the full deposit is
        # forfeited to cover the damage, so no refund is issued.
        if payment and payment.deposit_amount > 0 and (payment.refunded_amount or 0) == 0:
            # Credit the full deposit to the lender's wallet as compensation
            from app.models.wallet import WalletTransaction
            from app.models.enums import WalletTransactionType
            lender = db.query(User).filter(User.id == claim.filed_by_id).first()
            if lender:
                lender.wallet_balance += payment.deposit_amount
                comp_tx = WalletTransaction(
                    user_id=lender.id,
                    amount=payment.deposit_amount,
                    type=WalletTransactionType.EARNING,
                    reference_id=str(claim.id)
                )
                db.add(comp_tx)

    db.commit()
    db.refresh(claim)

    # Notify both parties
    for user_id, title, msg in [
        (
            claim.against_user_id,
            "Damage claim resolved",
            f"An admin has resolved the damage claim against you: {payload.admin_resolution}",
        ),
        (
            claim.filed_by_id,
            "Damage claim resolved",
            f"An admin has resolved your damage claim: {payload.admin_resolution}",
        ),
    ]:
        create_notification(
            db, user_id, NotificationType.DAMAGE_CLAIM_RESOLVED,
            title, msg, link=f"/damage-claims/{claim.id}",
        )

    return claim
