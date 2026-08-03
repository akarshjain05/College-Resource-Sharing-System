import uuid
from datetime import date, timedelta
from unittest.mock import patch, MagicMock

from app.models.enums import NotificationType
from app.models.misc import Notification
from app.services.notification_service import (
    create_notification,
    forward_to_microservice,
    notify_all_except_owner_bg,
)
from tests.conftest import auth_headers


def test_create_notification_service(db_session, test_user):
    """Test lower-level create_notification helper function."""
    notif = create_notification(
        db=db_session,
        user_id=test_user.id,
        notif_type=NotificationType.BORROW_REQUEST,
        title="New Borrow Request",
        message="Someone wants to borrow your item.",
        link="/requests/123",
    )

    assert notif.id is not None
    assert notif.user_id == test_user.id
    assert notif.type == NotificationType.BORROW_REQUEST
    assert notif.title == "New Borrow Request"
    assert notif.message == "Someone wants to borrow your item."
    assert notif.link == "/requests/123"
    assert notif.is_read is False


def test_list_user_notifications_api(client, test_user, second_user, db_session):
    """Test listing notifications via API with strict user isolation."""
    user1_headers = auth_headers(client, test_user.email, "Password123!")
    user2_headers = auth_headers(client, second_user.email, "Password123!")

    # Create notifications for User 1
    create_notification(db_session, test_user.id, NotificationType.SYSTEM, "Notif 1", "Message 1")
    create_notification(db_session, test_user.id, NotificationType.BORROW_APPROVED, "Notif 2", "Message 2")

    # Create notification for User 2
    create_notification(db_session, second_user.id, NotificationType.SYSTEM, "User 2 Notif", "Message U2")

    # User 1 API fetch
    resp1 = client.get("/api/v1/notifications", headers=user1_headers)
    assert resp1.status_code == 200
    notifs1 = resp1.json()
    assert len(notifs1) == 2
    assert {n["title"] for n in notifs1} == {"Notif 1", "Notif 2"}

    # User 2 API fetch
    resp2 = client.get("/api/v1/notifications", headers=user2_headers)
    assert resp2.status_code == 200
    notifs2 = resp2.json()
    assert len(notifs2) == 1
    assert notifs2[0]["title"] == "User 2 Notif"


def test_mark_single_notification_read(client, test_user, second_user, db_session):
    """Test marking a single notification as read and verifying owner security."""
    user1_headers = auth_headers(client, test_user.email, "Password123!")
    user2_headers = auth_headers(client, second_user.email, "Password123!")

    notif = create_notification(
        db_session, test_user.id, NotificationType.BORROW_REQUEST, "Borrow Request", "Read me!"
    )

    # User 2 tries to mark User 1's notification read -> 404 or forbidden
    forbidden_resp = client.post(f"/api/v1/notifications/{notif.id}/read", headers=user2_headers)
    assert forbidden_resp.status_code == 404

    # User 1 marks read -> Success
    read_resp = client.post(f"/api/v1/notifications/{notif.id}/read", headers=user1_headers)
    assert read_resp.status_code == 200
    assert read_resp.json()["is_read"] is True

    # Verify DB state
    db_notif = db_session.query(Notification).filter(Notification.id == notif.id).first()
    assert db_notif.is_read is True


def test_mark_all_notifications_read(client, test_user, db_session):
    """Test marking all unread notifications for a user as read."""
    headers = auth_headers(client, test_user.email, "Password123!")

    n1 = create_notification(db_session, test_user.id, NotificationType.SYSTEM, "N1", "M1")
    n2 = create_notification(db_session, test_user.id, NotificationType.SYSTEM, "N2", "M2")

    assert n1.is_read is False
    assert n2.is_read is False

    resp = client.post("/api/v1/notifications/read-all", headers=headers)
    assert resp.status_code == 204

    # Verify in DB
    unread_count = (
        db_session.query(Notification)
        .filter(Notification.user_id == test_user.id, Notification.is_read == False)
        .count()
    )
    assert unread_count == 0


def test_borrow_lifecycle_notifications(client, test_user, second_user, test_category, db_session):
    """Verify notification triggers throughout full borrow lifecycle."""
    owner_headers = auth_headers(client, test_user.email, "Password123!")
    borrower_headers = auth_headers(client, second_user.email, "Password123!")

    # 1. Create Resource
    res_resp = client.post(
        "/api/v1/resources",
        headers=owner_headers,
        json={
            "title": "Lab Microscope",
            "description": "High magnification student microscope",
            "condition": "good",
            "quantity": 1,
            "category_id": str(test_category.id),
            "max_borrow_days": 5,
        },
    )
    assert res_resp.status_code == 201
    resource_id = res_resp.json()["id"]

    # 2. Borrower creates borrow request
    req_resp = client.post(
        "/api/v1/borrow-requests",
        headers=borrower_headers,
        json={
            "resource_id": resource_id,
            "requested_start_date": date.today().isoformat(),
            "requested_end_date": (date.today() + timedelta(days=2)).isoformat(),
            "purpose": "Biology experiment",
        },
    )
    assert req_resp.status_code == 201
    req_id = req_resp.json()["id"]

    # Check owner received BORROW_REQUEST notification
    owner_notifs = client.get("/api/v1/notifications", headers=owner_headers).json()
    assert any(n["type"] == NotificationType.BORROW_REQUEST.value for n in owner_notifs)

    # 3. Owner approves request
    client.post(f"/api/v1/borrow-requests/{req_id}/approve", headers=owner_headers)

    # Check borrower received BORROW_APPROVED notification
    borrower_notifs = client.get("/api/v1/notifications", headers=borrower_headers).json()
    assert any(n["type"] == NotificationType.BORROW_APPROVED.value for n in borrower_notifs)

    # Mock payment so handover can proceed
    from app.models.payment import Payment
    from app.models.enums import PaymentStatus
    import uuid
    db_session.add(Payment(
        borrow_request_id=uuid.UUID(req_id),
        payer_id=second_user.id,
        razorpay_order_id="mock_order",
        razorpay_payment_id="mock_payment",
        rent_amount=100, deposit_amount=100, total_amount=200,
        currency="INR", status=PaymentStatus.PAID, refunded_amount=100
    ))
    db_session.commit()

    # 4. Owner hands over resource
    ho = client.post(f"/api/v1/borrow-requests/{req_id}/handover", headers=owner_headers)
    cho = client.post(f"/api/v1/borrow-requests/{req_id}/confirm-handover", headers=borrower_headers)
    
    # Mock time passing so we can return
    from app.models.borrow import BorrowRequest
    from datetime import datetime, timezone, timedelta
    br_record = db_session.query(BorrowRequest).filter(BorrowRequest.id == uuid.UUID(req_id)).first()
    br_record.requested_start_date = datetime.now(timezone.utc) - timedelta(days=1)
    db_session.commit()

    # 5. Borrower requests return
    ret_resp = client.post(f"/api/v1/borrow-requests/{req_id}/return", headers=borrower_headers, json={})
    assert ret_resp.status_code == 200, ret_resp.json()
    # Check owner received RETURN_REQUESTED (SYSTEM) notification
    owner_notifs_updated = client.get("/api/v1/notifications", headers=owner_headers).json()
    assert any("Return requested" in n["title"] for n in owner_notifs_updated)

    # 6. Owner confirms return
    client.post(f"/api/v1/borrow-requests/{req_id}/confirm-return", headers=owner_headers, json={})

    # Check borrower received RETURN_CONFIRMED notification
    borrower_notifs_updated = client.get("/api/v1/notifications", headers=borrower_headers).json()
    assert any(n["type"] == NotificationType.RETURN_CONFIRMED.value for n in borrower_notifs_updated)


def test_borrow_cancel_notification(client, test_user, second_user, test_category, db_session):
    """Verify lender receives a notification when borrower cancels a request."""
    owner_headers = auth_headers(client, test_user.email, "Password123!")
    borrower_headers = auth_headers(client, second_user.email, "Password123!")

    res_resp = client.post(
        "/api/v1/resources",
        headers=owner_headers,
        json={
            "title": "Projector",
            "description": "HD Portable Projector",
            "condition": "good",
            "quantity": 1,
            "category_id": str(test_category.id),
            "max_borrow_days": 3,
        },
    )
    resource_id = res_resp.json()["id"]

    req_resp = client.post(
        "/api/v1/borrow-requests",
        headers=borrower_headers,
        json={
            "resource_id": resource_id,
            "requested_start_date": "2026-08-01",
            "requested_end_date": "2026-08-03",
            "purpose": "Presentation",
        },
    )
    req_id = req_resp.json()["id"]

    # Borrower cancels request
    cancel_resp = client.post(f"/api/v1/borrow-requests/{req_id}/cancel", headers=borrower_headers)
    assert cancel_resp.status_code == 200

    # Verify owner (lender) receives cancellation notification
    owner_notifs = client.get("/api/v1/notifications", headers=owner_headers).json()
    assert any(n["title"] == "Borrow request cancelled" for n in owner_notifs)


def test_notify_all_except_owner_bg_helper(db_session, test_user, second_user):
    """Test background notification helper for newly listed resources."""
    resource_id = uuid.uuid4()
    notify_all_except_owner_bg(
        owner_id=test_user.id,
        resource_id=resource_id,
        resource_title="Scientific Calculator",
        owner_name="Test Student",
    )

    # Owner should NOT receive notification
    owner_count = db_session.query(Notification).filter(Notification.user_id == test_user.id).count()
    assert owner_count == 0

    # Second user SHOULD receive notification
    second_user_notif = (
        db_session.query(Notification)
        .filter(Notification.user_id == second_user.id)
        .first()
    )
    assert second_user_notif is not None
    assert second_user_notif.type == NotificationType.SYSTEM
    assert "Scientific Calculator" in second_user_notif.message


@patch("requests.post")
def test_forward_to_microservice(mock_post, test_user):
    """Test external notification microservice event forwarding payload structure."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_post.return_value = mock_response

    from app.services.notification_service import _forward_post

    url = "http://localhost:10000/events"
    headers = {"X-API-Key": "test-key", "Content-Type": "application/json"}
    payload = {
        "user_id": str(test_user.id),
        "event_type": "borrow.request",
        "channels": ["inapp", "push", "email"],
        "force_delivery": True,
        "payload": {
            "title": "Microscope Request",
            "message": "Student requested microscope",
            "link": "/borrow-requests/1",
        },
        "contact_info": {"email": test_user.email},
    }

    _forward_post(url, headers, payload)

    mock_post.assert_called_once_with(url, headers=headers, json=payload, timeout=2.5)


def test_websocket_realtime_notifications(client, test_user, db_session):
    """Test WebSocket endpoint real-time notification push."""
    from app.core.security import create_access_token
    token = create_access_token(str(test_user.id))

    with client.websocket_connect(f"/api/v1/ws/notifications?token={token}") as websocket:
        # Create notification in service
        create_notification(
            db=db_session,
            user_id=test_user.id,
            notif_type=NotificationType.SYSTEM,
            title="Realtime Test",
            message="WebSocket push payload test",
        )

        data = websocket.receive_json()
        assert data["title"] == "Realtime Test"
        assert data["message"] == "WebSocket push payload test"


def test_publish_resource_from_my_listings_sends_notification(client, test_user, second_user, test_category):
    """Test that publishing an item from My Listings (status update to AVAILABLE) sends notification to other users."""
    owner_headers = auth_headers(client, test_user.email, "Password123!")
    other_headers = auth_headers(client, second_user.email, "Password123!")

    # 1. Create unpublished resource (UNAVAILABLE status)
    res_resp = client.post(
        "/api/v1/resources",
        headers=owner_headers,
        json={
            "title": "Unpublished Drone",
            "description": "Camera drone in draft mode",
            "condition": "new",
            "quantity": 1,
            "category_id": str(test_category.id),
            "max_borrow_days": 3,
            "status": "unavailable",
        },
    )
    assert res_resp.status_code == 201
    resource_id = res_resp.json()["id"]

    # Clear any existing notifications
    client.get("/api/v1/notifications", headers=other_headers)

    # 2. Publish item via PUT /api/v1/resources/{id} (like My Listings toggle switch)
    pub_resp = client.put(
        f"/api/v1/resources/{resource_id}",
        headers=owner_headers,
        json={"status": "available"},
    )
    assert pub_resp.status_code == 200
    assert pub_resp.json()["status"] == "available"

    # 3. Check that second_user received "New Resource Listed" notification
    other_notifs = client.get("/api/v1/notifications", headers=other_headers).json()
    assert any("listed a new resource" in n["message"] for n in other_notifs)