import pytest
import asyncio
from app.models.enums import BorrowStatus, PaymentStatus
from app.models.borrow import BorrowRequest
from app.models.payment import Payment
from app.services import payment_service
from tests.conftest import auth_headers

import os
@pytest.mark.skipif(os.environ.get("DATABASE_URL", "sqlite").startswith("sqlite"), reason="SQLite in-memory DB segfaults with concurrent with_for_update()")
def test_concurrent_wallet_pay(client, db_session, test_user, second_user, test_category):
    # Create a resource and a borrow request in APPROVED state
    from app.models.resource import Resource
    resource = Resource(
        title="Test Resource", description="Test", category_id=test_category.id, owner_id=test_user.id,
        condition="good", daily_price=100, deposit_amount=500
    )
    db_session.add(resource)
    db_session.commit()

    import datetime
    br = BorrowRequest(
        resource_id=resource.id, borrower_id=second_user.id, lender_id=test_user.id,
        status=BorrowStatus.APPROVED,
        requested_start_date=datetime.datetime.now(datetime.timezone.utc),
        requested_end_date=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=2)
    )
    db_session.add(br)
    db_session.commit()

    # Give second_user some wallet balance
    second_user.wallet_balance = 100000 # 1000 INR
    db_session.commit()

    headers = auth_headers(client, second_user.email, "Password123!")

    # Perform concurrent requests
    import concurrent.futures
    def make_request():
        return client.post("/api/v1/payments/wallet/pay", headers=headers, json={"borrow_request_id": str(br.id)})

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(lambda _: make_request(), range(2)))

    # One should succeed, one should fail
    statuses = [r.status_code for r in results]
    assert 200 in statuses
    assert 400 in statuses

    # Check balance deduction
    db_session.refresh(second_user)
    # rent = 100 * 3 = 300; deposit = 500; total = 800 (80000 paise)
    assert second_user.wallet_balance == 100000 - 80000
    
    # Check that only one payment exists and is PAID
    payments = db_session.query(Payment).filter(Payment.borrow_request_id == br.id).all()
    assert len(payments) == 1
    assert payments[0].status == PaymentStatus.PAID

def test_signature_mismatch_rejection(client, db_session, test_user, second_user, test_category, monkeypatch):
    monkeypatch.setattr("app.services.payment_service.verify_payment_signature", lambda o, p, s: False)

    from app.models.resource import Resource
    resource = Resource(title="Test", description="Test", category_id=test_category.id, owner_id=test_user.id, condition="good")
    db_session.add(resource)
    db_session.commit()

    import datetime
    br = BorrowRequest(
        resource_id=resource.id, borrower_id=second_user.id, lender_id=test_user.id,
        status=BorrowStatus.APPROVED,
        requested_start_date=datetime.datetime.now(datetime.timezone.utc),
        requested_end_date=datetime.datetime.now(datetime.timezone.utc)
    )
    db_session.add(br)
    db_session.commit()

    payment = Payment(
        borrow_request_id=br.id, payer_id=second_user.id, razorpay_order_id="order_123",
        rent_amount=10000, deposit_amount=50000, total_amount=60000,
        currency="INR", status=PaymentStatus.CREATED
    )
    db_session.add(payment)
    db_session.commit()

    headers = auth_headers(client, second_user.email, "Password123!")
    resp = client.post("/api/v1/payments/verify", headers=headers, json={
        "razorpay_order_id": "order_123",
        "razorpay_payment_id": "pay_123",
        "razorpay_signature": "bad_sig"
    })
    
    assert resp.status_code == 400
    assert resp.json()["error_code"] == "SIGNATURE_INVALID"
    db_session.refresh(payment)
    assert payment.status == PaymentStatus.FAILED

def test_webhook_replay(client, db_session, test_user, second_user, test_category, monkeypatch):
    monkeypatch.setattr("app.services.payment_service.verify_webhook_signature", lambda b, s: True)

    from app.models.resource import Resource
    resource = Resource(title="Test", description="Test", category_id=test_category.id, owner_id=test_user.id, condition="good")
    db_session.add(resource)
    db_session.commit()

    import datetime
    br = BorrowRequest(
        resource_id=resource.id, borrower_id=second_user.id, lender_id=test_user.id,
        status=BorrowStatus.APPROVED,
        requested_start_date=datetime.datetime.now(datetime.timezone.utc),
        requested_end_date=datetime.datetime.now(datetime.timezone.utc)
    )
    db_session.add(br)
    db_session.commit()

    payment = Payment(
        payer_id=second_user.id, borrow_request_id=br.id, razorpay_order_id="order_webhook",
        rent_amount=0, deposit_amount=10000, total_amount=10000,
        currency="INR", status=PaymentStatus.CREATED
    )
    db_session.add(payment)
    db_session.commit()

    payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_webhook",
                    "order_id": "order_webhook",
                    "amount": 10000
                }
            }
        }
    }
    
    headers = {"X-Razorpay-Signature": "valid_sig", "X-Razorpay-Event-Id": "event_123"}
    resp1 = client.post("/api/v1/payments/webhook", json=payload, headers=headers)
    assert resp1.status_code == 200
    assert resp1.json()["status"] == "ok"
    
    db_session.refresh(payment)
    assert payment.status == PaymentStatus.PAID
    
    # Send duplicate
    resp2 = client.post("/api/v1/payments/webhook", json=payload, headers=headers)
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "duplicate_ignored"

def test_refund_idempotency(client, db_session, test_user, monkeypatch):
    monkeypatch.setattr("app.services.payment_service.verify_webhook_signature", lambda b, s: True)

    payment = Payment(
        payer_id=test_user.id, razorpay_order_id="order_refund", razorpay_payment_id="pay_refund",
        rent_amount=0, deposit_amount=10000, total_amount=10000,
        currency="INR", status=PaymentStatus.PAID, refunded_amount=0
    )
    db_session.add(payment)
    db_session.commit()

    payload = {
        "event": "refund.processed",
        "payload": {
            "refund": {
                "entity": {
                    "payment_id": "pay_refund",
                    "amount": 10000
                }
            }
        }
    }

    # Use first event
    headers1 = {"X-Razorpay-Signature": "valid_sig", "X-Razorpay-Event-Id": "event_refund_1"}
    resp1 = client.post("/api/v1/payments/webhook", json=payload, headers=headers1)
    assert resp1.status_code == 200
    assert resp1.json()["status"] == "ok"
    
    db_session.refresh(payment)
    assert payment.status == PaymentStatus.REFUNDED
    assert payment.refunded_amount == 10000

    # Same payload, different event_id (but same refund payload amount) -> doesn't double refund amount since code uses payload's cumulative refund.
    headers2 = {"X-Razorpay-Signature": "valid_sig", "X-Razorpay-Event-Id": "event_refund_2"}
    resp2 = client.post("/api/v1/payments/webhook", json=payload, headers=headers2)
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "ok"
    
    db_session.refresh(payment)
    # The refunded_amount is set to entity.get("amount", payment.refunded_amount)
    assert payment.refunded_amount == 10000
    assert payment.status == PaymentStatus.REFUNDED
