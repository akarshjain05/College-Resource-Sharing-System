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
