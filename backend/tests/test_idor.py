from datetime import date, timedelta
from uuid import uuid4, UUID
import pytest
from tests.conftest import auth_headers
from app.models.damage_claim import DamageClaim
from app.models.enums import DamageClaimStatus
from app.models.user import User


def create_resource(client, headers, category_id):
    payload = {
        "title": "Test IDOR Resource",
        "description": "Resource for IDOR tests",
        "condition": "good",
        "quantity": 1,
        "category_id": category_id,
        "max_borrow_days": 7,
        "deposit_amount": 0,
    }
    return client.post("/api/v1/resources", json=payload, headers=headers).json()


def request_borrow(client, headers, resource_id):
    start = date.today()
    end = start + timedelta(days=3)
    return client.post(
        "/api/v1/borrow-requests",
        headers=headers,
        json={
            "resource_id": resource_id,
            "requested_start_date": start.isoformat(),
            "requested_end_date": end.isoformat(),
            "purpose": "Testing IDOR",
        },
    )


def test_idor_borrow_request_cancel(client, db_session, test_user, second_user, test_category):
    """
    Test that a third-party user (not owner, not borrower) cannot cancel another user's borrow request.
    """
    from app.models.user import User
    from app.core.security import hash_password
    from app.models.enums import UserRole

    owner_headers = auth_headers(client, test_user.email, "Password123!")
    borrower_headers = auth_headers(client, second_user.email, "Password123!")

    # Create a third-party attacker user
    attacker = User(
        full_name="Third Attacker",
        email="attacker@svnit.ac.in",
        hashed_password=hash_password("Password123!"),
        role=UserRole.STUDENT,
        is_verified=True,
    )
    db_session.add(attacker)
    db_session.commit()
    attacker_headers = auth_headers(client, "attacker@svnit.ac.in", "Password123!")

    resource = create_resource(client, owner_headers, str(test_category.id))
    req_resp = request_borrow(client, borrower_headers, resource["id"])
    assert req_resp.status_code == 201
    request_id = req_resp.json()["id"]

    # Attacker tries to cancel the borrower's request
    cancel_resp = client.post(f"/api/v1/borrow-requests/{request_id}/cancel", headers=attacker_headers)
    print("RESPONSE:", cancel_resp.json())
    assert cancel_resp.status_code in (403, 404), f"Unexpected status {cancel_resp.status_code}: {cancel_resp.text}"


def test_idor_resource_update(client, test_user, second_user, test_category):
    """
    Test that User B cannot update User A's resource.
    """
    owner_headers = auth_headers(client, test_user.email, "Password123!")
    attacker_headers = auth_headers(client, second_user.email, "Password123!")

    resource = create_resource(client, owner_headers, str(test_category.id))
    resource_id = resource["id"]

    update_payload = {
        "title": "Hacked Title by User B",
        "description": "Attacker changed this",
        "condition": "good",
        "category_id": str(test_category.id),
    }
    update_resp = client.put(
        f"/api/v1/resources/{resource_id}",
        json=update_payload,
        headers=attacker_headers,
    )
    assert update_resp.status_code == 403


def test_idor_damage_claim_dispute(client, test_user, second_user, test_category, db_session):
    """
    Test that User B cannot dispute User A's damage claim.
    """
    owner_headers = auth_headers(client, test_user.email, "Password123!")
    borrower_headers = auth_headers(client, second_user.email, "Password123!")
    resource = create_resource(client, owner_headers, str(test_category.id))
    req_resp = request_borrow(client, borrower_headers, resource["id"])
    borrow_request_id = req_resp.json()["id"]

    claim = DamageClaim(
        borrow_request_id=UUID(borrow_request_id),
        filed_by_id=uuid4(),
        against_user_id=test_user.id,
        estimated_cost=500.0,
        description="Broken lens",
        status=DamageClaimStatus.OPEN,
    )
    db_session.add(claim)
    db_session.commit()
    db_session.refresh(claim)

    attacker_headers = auth_headers(client, second_user.email, "Password123!")
    dispute_resp = client.post(
        f"/api/v1/damage-claims/{claim.id}/dispute",
        json={"dispute_reason": "I want to dispute someone else's claim"},
        headers=attacker_headers,
    )
    assert dispute_resp.status_code == 403
    assert "borrower can dispute" in dispute_resp.json()["detail"].lower()

