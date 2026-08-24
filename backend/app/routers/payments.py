import uuid
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Request, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.rate_limit import limiter
from app.core.exceptions import NotFoundException, ForbiddenException, AppException
from app.core.config import settings
from app.models.borrow import BorrowRequest
from app.models.payment import Payment
from app.models.enums import BorrowStatus, PaymentStatus, NotificationType
from app.models.user import User
from app.schemas.payment import (
    PaymentOrderCreate,
    PaymentOrderResponse,
    PaymentVerifyRequest,
    PaymentResponse,
    MyTransactionsResponse,
    TransactionItem,
    WalletSummary,
    WalletTopUpOrderCreate,
    WalletPayRequest,
)
from app.models.wallet import WalletTransaction
from app.models.enums import WalletTransactionType
from app.services import payment_service
from app.services.notification_service import create_notification
from app.services.email_service import send_payment_confirmation_email

from typing import List

router = APIRouter(prefix="/payments", tags=["Payments"])
logger = logging.getLogger("crss")

@router.get("/my-payments", response_model=List[PaymentResponse])
def get_my_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all payments associated with the current logged-in user.
    """
    payments = db.query(Payment).filter(Payment.payer_id == current_user.id).order_by(Payment.created_at.desc()).all()
    return payments



def _compute_amounts(br: BorrowRequest) -> tuple[int, int, int]:
    """Server-side source of truth for pricing — mirrors the frontend's display math,
    but the frontend numbers are NEVER trusted for the actual charge."""
    resource = br.resource
    deposit_val = float(getattr(resource, "deposit_amount", 0) or 0)
    try:
        days = max(1, (br.requested_end_date.date() - br.requested_start_date.date()).days + 1)
    except Exception:
        days = 1
    resource_daily_price = float(getattr(resource, "daily_price", 0) or 0)
    daily_price = int(resource_daily_price)
    rent = daily_price * days
    deposit = int(deposit_val)
    rent_paise = rent * 100
    deposit_paise = deposit * 100
    total_paise = max(100, rent_paise + deposit_paise)
    return rent_paise, deposit_paise, total_paise


@router.get("/my", response_model=MyTransactionsResponse)
def get_my_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    brs = db.query(BorrowRequest).filter(
        (BorrowRequest.borrower_id == current_user.id) | (BorrowRequest.lender_id == current_user.id)
    ).order_by(BorrowRequest.created_at.desc()).all()

    items = []
    total_spent_paise = 0
    total_earned_paise = 0
    active_deposits_paise = 0
    pending_to_be_paid_paise = 0

    for br in brs:
        p = db.query(Payment).filter(Payment.borrow_request_id == br.id).order_by(Payment.created_at.desc()).first()
        is_lender = (br.lender_id == current_user.id)
        other_party = (
            getattr(br.borrower, "full_name", "Unknown") if is_lender else getattr(br.lender, "full_name", "Unknown")
        )
        item_title = getattr(br.resource, "title", "Unknown Resource") if br.resource else "Unknown Resource"
        image_url = None
        if br.resource and br.resource.images and len(br.resource.images) > 0:
            first_img = br.resource.images[0]
            if hasattr(first_img, "image_url"):
                image_url = first_img.image_url
            elif isinstance(first_img, str):
                image_url = first_img
            else:
                image_url = str(getattr(first_img, "url", "")) or None

        if p:
            tx_type = "CREDIT" if is_lender else "DEBIT"
            status_str = p.status.value if hasattr(p.status, "value") else str(p.status)

            if p.status in (PaymentStatus.PAID, PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUND_INITIATED):
                if tx_type == "DEBIT":
                    spent = (p.rent_amount or 0) + max(0, (p.deposit_amount or 0) - (p.refunded_amount or 0))
                    total_spent_paise += spent
                    if br.status in (
                        BorrowStatus.APPROVED,
                        BorrowStatus.ACTIVE,
                        BorrowStatus.HANDOVER_REQUESTED,
                        BorrowStatus.RETURN_REQUESTED,
                        BorrowStatus.LATE,
                    ):
                        active_deposits_paise += max(0, (p.deposit_amount or 0) - (p.refunded_amount or 0))
                else:
                    total_earned_paise += (p.rent_amount or 0)
            elif tx_type == "DEBIT" and br.status == BorrowStatus.APPROVED:
                pending_to_be_paid_paise += (p.total_amount or 0)

            items.append(
                TransactionItem(
                    id=str(p.id),
                    borrow_request_id=str(br.id),
                    status=status_str,
                    rent_amount=int(p.rent_amount or 0),
                    deposit_amount=int(p.deposit_amount or 0),
                    total_amount=int(p.total_amount or 0),
                    currency=p.currency or "INR",
                    refunded_amount=int(p.refunded_amount or 0),
                    created_at=p.created_at.isoformat() if p.created_at else "",
                    razorpay_payment_id=p.razorpay_payment_id,
                    transaction_type=tx_type,
                    item_title=item_title,
                    item_image=image_url,
                    other_party_name=other_party,
                    borrow_status=br.status.value if hasattr(br.status, "value") else str(br.status),
                    is_to_be_paid=(status_str in ("created", "attempted", "pending_payment") and br.status == BorrowStatus.APPROVED and not is_lender),
                )
            )
        elif not is_lender and br.status == BorrowStatus.APPROVED:
            rent_paise, deposit_paise, total_paise = _compute_amounts(br)
            pending_to_be_paid_paise += total_paise
            items.append(
                TransactionItem(
                    id=f"pending_{br.id}",
                    borrow_request_id=str(br.id),
                    status="PENDING_PAYMENT",
                    rent_amount=rent_paise,
                    deposit_amount=deposit_paise,
                    total_amount=total_paise,
                    currency=settings.RAZORPAY_CURRENCY,
                    refunded_amount=0,
                    created_at=br.created_at.isoformat() if br.created_at else "",
                    razorpay_payment_id=None,
                    transaction_type="DEBIT",
                    item_title=item_title,
                    item_image=image_url,
                    other_party_name=other_party,
                    borrow_status=br.status.value if hasattr(br.status, "value") else str(br.status),
                    is_to_be_paid=True,
                )
            )

    return MyTransactionsResponse(
        summary=WalletSummary(
            total_spent_paise=total_spent_paise,
            total_earned_paise=total_earned_paise,
            active_deposits_paise=active_deposits_paise,
            pending_to_be_paid_paise=pending_to_be_paid_paise,
            wallet_balance=current_user.wallet_balance,
        ),
        transactions=items,
    )

@router.post("/wallet/topup/order", response_model=PaymentOrderResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def create_wallet_topup_order(
    request: Request,
    payload: WalletTopUpOrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    import time
    order = payment_service.create_order(
        amount_paise=payload.amount_paise,
        receipt=f"wt_{str(current_user.id)[:8]}_{int(time.time())}",
        notes={"user_id": str(current_user.id), "type": "wallet_topup"},
    )
    payment = Payment(
        payer_id=current_user.id,
        razorpay_order_id=order["id"],
        rent_amount=0,
        deposit_amount=payload.amount_paise,
        total_amount=payload.amount_paise,
        currency=settings.RAZORPAY_CURRENCY,
        status=PaymentStatus.CREATED,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return PaymentOrderResponse(
        payment_id=payment.id, razorpay_order_id=order["id"], razorpay_key_id=settings.RAZORPAY_KEY_ID,
        amount=payload.amount_paise, currency=settings.RAZORPAY_CURRENCY, rent_amount=0, deposit_amount=payload.amount_paise,
    )

@router.post("/wallet/topup/verify", response_model=PaymentResponse)
@limiter.limit("20/minute")
def verify_wallet_topup(
    request: Request,
    payload: PaymentVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payment = db.query(Payment).filter(Payment.razorpay_order_id == payload.razorpay_order_id).with_for_update().first()
    if not payment:
        raise NotFoundException("Payment order not found")
    if payment.payer_id != current_user.id:
        raise ForbiddenException("Not your payment")
    if payment.status == PaymentStatus.PAID:
        return payment

    valid = payment_service.verify_payment_signature(
        payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature
    )
    if not valid:
        payment.status = PaymentStatus.FAILED
        payment.failure_reason = "Signature verification failed"
        db.commit()
        raise AppException("Payment verification failed", status.HTTP_400_BAD_REQUEST, "SIGNATURE_INVALID")

    payment.razorpay_payment_id = payload.razorpay_payment_id
    payment.razorpay_signature = payload.razorpay_signature
    payment.status = PaymentStatus.PAID
    
    current_user.wallet_balance += payment.total_amount
    tx = WalletTransaction(
        user_id=current_user.id,
        amount=payment.total_amount,
        type=WalletTransactionType.TOP_UP,
        reference_id=str(payment.id)
    )
    db.add(tx)
    db.commit()
    return payment

@router.post("/wallet/pay", response_model=PaymentResponse)
@limiter.limit("10/minute")
def pay_from_wallet(
    request: Request,
    payload: WalletPayRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    br = db.query(BorrowRequest).filter(BorrowRequest.id == payload.borrow_request_id).first()
    if not br:
        raise NotFoundException("Borrow request not found")
    if br.borrower_id != current_user.id:
        raise ForbiddenException("Only the borrower can pay for this request")
    if br.status != BorrowStatus.APPROVED:
        raise AppException(
            "Payment can only be made after the owner approves the request",
            status_code=status.HTTP_400_BAD_REQUEST, error_code="INVALID_STATE",
        )

    existing = db.query(Payment).filter(Payment.borrow_request_id == br.id).order_by(Payment.created_at.desc()).first()
    if existing and existing.status == PaymentStatus.PAID:
        raise AppException("This request has already been paid for", status.HTTP_400_BAD_REQUEST, "ALREADY_PAID")

    rent_paise, deposit_paise, total_paise = _compute_amounts(br)

    locked_user = db.query(User).filter(User.id == current_user.id).with_for_update().first()
    if locked_user.wallet_balance < total_paise:
        raise AppException("Insufficient wallet balance", status.HTTP_400_BAD_REQUEST, "INSUFFICIENT_BALANCE", data={"required_paise": total_paise})

    import uuid
    payment_id_str = f"wallet_{uuid.uuid4().hex[:16]}"
    
    if existing:
        payment = existing
        payment.rent_amount = rent_paise
        payment.deposit_amount = deposit_paise
        payment.total_amount = total_paise
        payment.currency = settings.RAZORPAY_CURRENCY
        payment.status = PaymentStatus.CREATED
    else:
        payment = Payment(
            borrow_request_id=br.id,
            payer_id=current_user.id,
            rent_amount=rent_paise,
            deposit_amount=deposit_paise,
            total_amount=total_paise,
            currency=settings.RAZORPAY_CURRENCY,
            status=PaymentStatus.CREATED,
        )
        db.add(payment)

    locked_user.wallet_balance -= total_paise
    tx = WalletTransaction(
        user_id=locked_user.id,
        amount=-total_paise,
        type=WalletTransactionType.BORROW_DEDUCTION,
        reference_id=str(br.id)
    )
    db.add(tx)
    
    db.commit()
    db.refresh(payment)
    
    _mark_paid(db, payment, payment_id_str, None, background_tasks)
    return payment
@router.post("/orders", response_model=PaymentOrderResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def create_payment_order(
    request: Request,
    payload: PaymentOrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    br = db.query(BorrowRequest).filter(BorrowRequest.id == payload.borrow_request_id).first()
    if not br:
        raise NotFoundException("Borrow request not found")
    if br.borrower_id != current_user.id:
        raise ForbiddenException("Only the borrower can pay for this request")
    if br.status != BorrowStatus.APPROVED:
        raise AppException(
            "Payment can only be made after the owner approves the request",
            status_code=status.HTTP_400_BAD_REQUEST, error_code="INVALID_STATE",
        )

    existing = db.query(Payment).filter(Payment.borrow_request_id == br.id).order_by(Payment.created_at.desc()).first()
    if existing and existing.status == PaymentStatus.PAID:
        raise AppException("This request has already been paid for", status.HTTP_400_BAD_REQUEST, "ALREADY_PAID")

    rent_paise, deposit_paise, total_paise = _compute_amounts(br)

    import time
    order = payment_service.create_order(
        amount_paise=total_paise,
        receipt=f"br_{str(br.id)[:18]}_{int(time.time())}",
        notes={"borrow_request_id": str(br.id), "borrower_id": str(current_user.id)},
    )

    if existing and existing.status in (PaymentStatus.CREATED, PaymentStatus.ATTEMPTED, PaymentStatus.FAILED):
        existing.razorpay_order_id = order["id"]
        existing.rent_amount = rent_paise
        existing.deposit_amount = deposit_paise
        existing.total_amount = total_paise
        existing.currency = settings.RAZORPAY_CURRENCY
        existing.status = PaymentStatus.CREATED
        db.commit()
        db.refresh(existing)
        return PaymentOrderResponse(
            payment_id=existing.id, razorpay_order_id=existing.razorpay_order_id,
            razorpay_key_id=settings.RAZORPAY_KEY_ID, amount=existing.total_amount,
            currency=existing.currency, rent_amount=existing.rent_amount, deposit_amount=existing.deposit_amount,
        )

    payment = Payment(
        borrow_request_id=br.id,
        payer_id=current_user.id,
        razorpay_order_id=order["id"],
        rent_amount=rent_paise,
        deposit_amount=deposit_paise,
        total_amount=total_paise,
        currency=settings.RAZORPAY_CURRENCY,
        status=PaymentStatus.CREATED,
    )
    db.add(payment)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.query(Payment).filter(Payment.borrow_request_id == br.id).first()
        existing.razorpay_order_id = order["id"]
        db.commit()
        db.refresh(existing)
        return PaymentOrderResponse(
            payment_id=existing.id, razorpay_order_id=existing.razorpay_order_id,
            razorpay_key_id=settings.RAZORPAY_KEY_ID, amount=existing.total_amount,
            currency=existing.currency, rent_amount=existing.rent_amount, deposit_amount=existing.deposit_amount,
        )

    return PaymentOrderResponse(
        payment_id=payment.id, razorpay_order_id=order["id"], razorpay_key_id=settings.RAZORPAY_KEY_ID,
        amount=total_paise, currency=settings.RAZORPAY_CURRENCY, rent_amount=rent_paise, deposit_amount=deposit_paise,
    )


@router.post("/verify", response_model=PaymentResponse)
@limiter.limit("20/minute")
def verify_payment(
    request: Request,
    payload: PaymentVerifyRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payment = db.query(Payment).filter(Payment.razorpay_order_id == payload.razorpay_order_id).first()
    if not payment:
        raise NotFoundException("Payment order not found")
    if payment.payer_id != current_user.id:
        raise ForbiddenException("Not your payment")

    if payment.status == PaymentStatus.PAID:
        return payment

    valid = payment_service.verify_payment_signature(
        payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature
    )
    if not valid:
        payment.status = PaymentStatus.FAILED
        payment.failure_reason = "Signature verification failed"
        db.commit()
        raise AppException("Payment verification failed", status.HTTP_400_BAD_REQUEST, "SIGNATURE_INVALID")

    _mark_paid(db, payment, payload.razorpay_payment_id, payload.razorpay_signature, background_tasks)
    return payment


def _mark_paid(db: Session, payment: Payment, razorpay_payment_id: str, signature: str | None, background_tasks: BackgroundTasks):
    if payment.status == PaymentStatus.PAID:
        return
    payment.razorpay_payment_id = razorpay_payment_id
    payment.razorpay_signature = signature
    payment.status = PaymentStatus.PAID
    db.commit()

    br = payment.borrow_request
    import json
    create_notification(
        db, br.lender_id, NotificationType.PAYMENT_SUCCESS,
        "Payment received",
        json.dumps({
            "action": "received",
            "amount": payment.total_amount / 100,
            "item_title": br.resource.title,
            "payer_name": payment.payer.full_name,
            "transaction_id": razorpay_payment_id or payment.razorpay_order_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }),
        link=f"/my-bookings?id={br.id}&tab=lending",
    )
    create_notification(
        db, br.borrower_id, NotificationType.PAYMENT_SUCCESS,
        "Payment successful",
        json.dumps({
            "action": "paid",
            "amount": payment.total_amount / 100,
            "item_title": br.resource.title,
            "payer_name": payment.payer.full_name,
            "transaction_id": razorpay_payment_id or payment.razorpay_order_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }),
        link=f"/my-bookings?id={br.id}&tab=borrowing",
    )
    if payment.payer.email:
        background_tasks.add_task(
            send_payment_confirmation_email, payment.payer.email, payment.payer.full_name,
            br.resource.title, payment.total_amount / 100,
        )


@router.post("/webhook", status_code=status.HTTP_200_OK, include_in_schema=False)
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    raw_body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    if not payment_service.verify_webhook_signature(raw_body, signature):
        logger.warning("Rejected webhook with invalid signature")
        raise AppException("Invalid signature", status.HTTP_400_BAD_REQUEST, "INVALID_WEBHOOK_SIGNATURE")

    payload = await request.json()
    event = payload.get("event")
    event_id = request.headers.get("X-Razorpay-Event-Id", "")

    entity = payload.get("payload", {}).get("payment", {}).get("entity", {}) \
        or payload.get("payload", {}).get("refund", {}).get("entity", {})
    order_id = entity.get("order_id")
    if not order_id and event.startswith("refund"):
        order_id = entity.get("payment_id")

    payment = None
    if entity.get("order_id"):
        payment = db.query(Payment).filter(Payment.razorpay_order_id == entity["order_id"]).first()
    elif entity.get("payment_id"):
        payment = db.query(Payment).filter(Payment.razorpay_payment_id == entity["payment_id"]).first()

    if not payment:
        logger.warning("Webhook for unknown order/payment: %s", payload)
        return {"status": "ignored"}

    if payment.last_webhook_event_id == event_id:
        return {"status": "duplicate_ignored"}

    background_tasks = BackgroundTasks()

    if event == "payment.captured":
        _mark_paid(db, payment, entity.get("id"), None, background_tasks)
    elif event == "payment.failed":
        if payment.status != PaymentStatus.PAID:
            payment.status = PaymentStatus.FAILED
            payment.failure_reason = entity.get("error_description", "Payment failed")
    elif event == "refund.processed":
        payment.refunded_amount = entity.get("amount", payment.refunded_amount)
        payment.status = (
            PaymentStatus.REFUNDED if payment.refunded_amount >= payment.total_amount
            else PaymentStatus.PARTIALLY_REFUNDED
        )

    payment.last_webhook_event_id = event_id
    db.commit()
    for task in background_tasks.tasks:
        task()
    return {"status": "ok"}


@router.post("/reconcile-cron", include_in_schema=False)
def reconcile_payments_cron(request: Request, db: Session = Depends(get_db)):
    """Called periodically by an external cron to check on stale CREATED orders."""
    import hmac
    cron_secret = request.headers.get("X-Cron-Secret") or ""
    if not hmac.compare_digest(cron_secret, settings.CRON_SECRET):
        raise AppException(
            "Unauthorized cron execution", 
            status_code=401, 
            error_code="UNAUTHORIZED"
        )
    
    cutoff = datetime.now(timezone.utc) - timedelta(hours=1)
    stale_payments = db.query(Payment).filter(
        Payment.status == PaymentStatus.CREATED,
        Payment.created_at < cutoff
    ).all()
    
    for p in stale_payments:
        p.status = PaymentStatus.FAILED
        p.failure_reason = "Order expired / abandoned"
        
    db.commit()
    return {"status": "ok", "reconciled": len(stale_payments)}
