import hmac
import hashlib
import logging

import razorpay
from app.core.config import settings

logger = logging.getLogger("crss")

_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def create_order(*, amount_paise: int, receipt: str, notes: dict) -> dict:
    """
    amount_paise MUST be computed server-side from trusted DB values
    (resource.deposit_amount, days, etc.) — never accept an amount from the client.
    """
    return _client.order.create({
        "amount": amount_paise,
        "currency": settings.RAZORPAY_CURRENCY,
        "receipt": str(receipt)[:40],
        "payment_capture": 1,  # auto-capture on successful authorization
        "notes": notes,
    })


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """
    HMAC-SHA256 of "order_id|payment_id" using the Key Secret. This is what proves the
    checkout response actually came from Razorpay and wasn't forged/replayed by the client.
    """
    try:
        _client.utility.verify_payment_signature({
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
        })
        return True
    except razorpay.errors.SignatureVerificationError:
        logger.warning("Razorpay signature verification failed for order %s", order_id)
        return False


def verify_webhook_signature(raw_body: bytes, signature_header: str) -> bool:
    """
    Verifies X-Razorpay-Signature against the RAW request body using the separate
    Webhook Secret (not the Key Secret). Must be computed over raw bytes, before
    any JSON parsing/re-serialization, or the signature will never match.
    """
    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header or "")




from app.models.wallet import WalletTransaction
from app.models.enums import WalletTransactionType
import uuid

def refund_payment(db, payment: "Payment", *, amount_paise: int, notes: dict) -> dict:
    from app.models.enums import PaymentStatus
    user = payment.payer
    if not user:
        raise ValueError("Payment must have a payer associated")

    user.wallet_balance += amount_paise
    refund_id = f"refund_{uuid.uuid4().hex[:16]}"
    
    tx = WalletTransaction(
        user_id=user.id,
        amount=amount_paise,
        type=WalletTransactionType.REFUND,
        reference_id=payment.razorpay_payment_id
    )
    db.add(tx)

    payment.refunded_amount = (payment.refunded_amount or 0) + amount_paise
    payment.status = (
        PaymentStatus.REFUNDED if payment.refunded_amount >= payment.total_amount
        else PaymentStatus.PARTIALLY_REFUNDED
    )
    payment.refund_id = refund_id
    
    return {"id": refund_id}

def build_transaction_item(br, p, current_user, is_lender, rent_paise, deposit_paise, total_paise):
    from app.schemas.payment import TransactionItem
    from app.models.enums import BorrowStatus

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
        return TransactionItem(
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
    else:
        return TransactionItem(
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

