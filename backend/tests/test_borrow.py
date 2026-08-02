from datetime import date, timedelta

from tests.conftest import auth_headers


def create_resource(client, headers, category_id):
    payload = {
        "title": "Canon DSLR Camera",
        "description": "18-55mm kit lens included, barely used.",
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
            "purpose": "Club event photography",
        },
    )


def test_full_borrow_lifecycle(client, test_user, second_user, test_category):
    owner_headers = auth_headers(client, test_user.email, "Password123!")
    borrower_headers = auth_headers(client, second_user.email, "Password123!")

    resource = create_resource(client, owner_headers, str(test_category.id))

    # Borrower requests the item
    req_resp = request_borrow(client, borrower_headers, resource["id"])
    assert req_resp.status_code == 201
    request_id = req_resp.json()["id"]
    assert req_resp.json()["status"] == "requested"

    # Owner approves
    approve_resp = client.post(f"/api/v1/borrow-requests/{request_id}/approve", headers=owner_headers)
    assert approve_resp.status_code == 200
    assert approve_resp.json()["status"] == "approved"

    # A booking for future dates must NOT make the resource look globally
    # unavailable -- quantity_available is total owned, not a "still free
    # right now" counter that drifts on approval.
    resource_resp = client.get(f"/api/v1/resources/{resource['id']}")
    assert resource_resp.json()["quantity_available"] == 1
    assert resource_resp.json()["status"] == "available"

    # Owner hands over the item
    handover_resp = client.post(f"/api/v1/borrow-requests/{request_id}/handover", headers=owner_headers)
    assert handover_resp.status_code == 200
    assert handover_resp.json()["status"] == "handover_requested"

    # Borrower confirms handover
    confirm_ho_resp = client.post(f"/api/v1/borrow-requests/{request_id}/confirm-handover", headers=borrower_headers)
    assert confirm_ho_resp.status_code == 200
    assert confirm_ho_resp.json()["status"] == "active"

    # Borrower returns the item
    return_resp = client.post(f"/api/v1/borrow-requests/{request_id}/return", headers=borrower_headers, json={})
    assert return_resp.status_code == 200
    assert return_resp.json()["status"] == "return_requested"

    # Owner confirms return
    confirm_resp = client.post(
        f"/api/v1/borrow-requests/{request_id}/confirm-return",
        headers=owner_headers,
        json={"borrower_rating": 5}
    )
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["status"] == "returned"
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["status"] == "returned"

    resource_resp_2 = client.get(f"/api/v1/resources/{resource['id']}")
    assert resource_resp_2.json()["quantity_available"] == 1
    assert resource_resp_2.json()["status"] == "available"


def test_non_overlapping_dates_both_bookable(client, test_user, second_user, test_category, db_session):
    """
    The exact bug reported: resource has 1 unit. Borrower A gets approved for
    one date range; a second, non-overlapping date range must still be
    requestable and approvable for someone else -- it must NOT be blocked just
    because *some* request on this resource was already approved.
    """
    from app.models.user import User
    from app.core.security import hash_password
    import uuid as uuid_module

    third = User(
        id=uuid_module.uuid4(),
        email="third@svnit.ac.in",
        full_name="Third User",
        hashed_password=hash_password("Password123!"),
        is_verified=True,
    )
    db_session.add(third)
    db_session.commit()

    owner_headers = auth_headers(client, test_user.email, "Password123!")
    borrower_a_headers = auth_headers(client, second_user.email, "Password123!")
    borrower_b_headers = auth_headers(client, third.email, "Password123!")

    resource = create_resource(client, owner_headers, str(test_category.id))

    start_a = date.today() + timedelta(days=1)
    end_a = start_a + timedelta(days=3)
    req_a = client.post(
        "/api/v1/borrow-requests", headers=borrower_a_headers,
        json={"resource_id": resource["id"], "requested_start_date": start_a.isoformat(), "requested_end_date": end_a.isoformat(), "purpose": "A"},
    )
    assert req_a.status_code == 201
    approve_a = client.post(f"/api/v1/borrow-requests/{req_a.json()['id']}/approve", headers=owner_headers)
    assert approve_a.status_code == 200

    # Days [+10, +13] -- does not overlap A at all
    start_b = date.today() + timedelta(days=10)
    end_b = start_b + timedelta(days=3)
    req_b = client.post(
        "/api/v1/borrow-requests", headers=borrower_b_headers,
        json={"resource_id": resource["id"], "requested_start_date": start_b.isoformat(), "requested_end_date": end_b.isoformat(), "purpose": "B"},
    )
    assert req_b.status_code == 201, "Non-overlapping request must be creatable even though another request was already approved"
    approve_b = client.post(f"/api/v1/borrow-requests/{req_b.json()['id']}/approve", headers=owner_headers)
    assert approve_b.status_code == 200, "Non-overlapping request must be approvable even though another request was already approved"


def test_overlapping_dates_rejected(client, test_user, second_user, test_category, db_session):
    """A date range that genuinely conflicts with an already-approved booking must still be blocked."""
    from app.models.user import User
    from app.core.security import hash_password
    import uuid as uuid_module

    third = User(
        id=uuid_module.uuid4(),
        email="fourth@svnit.ac.in",
        full_name="Fourth User",
        hashed_password=hash_password("Password123!"),
        is_verified=True,
    )
    db_session.add(third)
    db_session.commit()

    owner_headers = auth_headers(client, test_user.email, "Password123!")
    borrower_a_headers = auth_headers(client, second_user.email, "Password123!")
    borrower_b_headers = auth_headers(client, third.email, "Password123!")

    resource = create_resource(client, owner_headers, str(test_category.id))

    start_a = date.today() + timedelta(days=1)
    end_a = start_a + timedelta(days=5)
    req_a = client.post(
        "/api/v1/borrow-requests", headers=borrower_a_headers,
        json={"resource_id": resource["id"], "requested_start_date": start_a.isoformat(), "requested_end_date": end_a.isoformat(), "purpose": "A"},
    )
    assert client.post(f"/api/v1/borrow-requests/{req_a.json()['id']}/approve", headers=owner_headers).status_code == 200

    # Overlaps day +3 through +8 with A's [+1, +6] window
    start_b = date.today() + timedelta(days=3)
    end_b = start_b + timedelta(days=5)
    req_b = client.post(
        "/api/v1/borrow-requests", headers=borrower_b_headers,
        json={"resource_id": resource["id"], "requested_start_date": start_b.isoformat(), "requested_end_date": end_b.isoformat(), "purpose": "B"},
    )
    assert req_b.status_code == 400
    assert req_b.json()["error_code"] == "DATE_CONFLICT"


def test_cannot_borrow_own_resource(client, test_user, test_category):
    headers = auth_headers(client, test_user.email, "Password123!")
    resource = create_resource(client, headers, str(test_category.id))

    resp = request_borrow(client, headers, resource["id"])
    assert resp.status_code == 400
    assert resp.json()["error_code"] == "SELF_BORROW"


def test_reject_borrow_request(client, test_user, second_user, test_category):
    owner_headers = auth_headers(client, test_user.email, "Password123!")
    borrower_headers = auth_headers(client, second_user.email, "Password123!")

    resource = create_resource(client, owner_headers, str(test_category.id))
    req_resp = request_borrow(client, borrower_headers, resource["id"])
    request_id = req_resp.json()["id"]

    reject_resp = client.post(
        f"/api/v1/borrow-requests/{request_id}/reject",
        headers=owner_headers,
        json={"rejection_reason": "Already lent out"},
    )
    assert reject_resp.status_code == 200
    assert reject_resp.json()["status"] == "rejected"
    assert reject_resp.json()["rejection_reason"] == "Already lent out"


def test_non_owner_cannot_approve(client, test_user, second_user, test_category):
    owner_headers = auth_headers(client, test_user.email, "Password123!")
    borrower_headers = auth_headers(client, second_user.email, "Password123!")

    resource = create_resource(client, owner_headers, str(test_category.id))
    req_resp = request_borrow(client, borrower_headers, resource["id"])
    request_id = req_resp.json()["id"]

    resp = client.post(f"/api/v1/borrow-requests/{request_id}/approve", headers=borrower_headers)
    assert resp.status_code == 403


def test_auto_decline_other_requests_on_approval(client, test_user, second_user, admin_user, test_category):
    owner_headers = auth_headers(client, test_user.email, "Password123!")
    borrower1_headers = auth_headers(client, second_user.email, "Password123!")
    borrower2_headers = auth_headers(client, admin_user.email, "AdminPass123!")

    # Single quantity item
    resource = create_resource(client, owner_headers, str(test_category.id))

    # Two borrowers request the same item
    req1 = request_borrow(client, borrower1_headers, resource["id"]).json()
    req2 = request_borrow(client, borrower2_headers, resource["id"]).json()

    assert req1["status"] == "requested"
    assert req2["status"] == "requested"

    # Owner approves req1
    approve_resp = client.post(f"/api/v1/borrow-requests/{req1['id']}/approve", headers=owner_headers)
    assert approve_resp.status_code == 200
    assert approve_resp.json()["status"] == "approved"

    # Req2 should be automatically rejected / declined
    req2_check = client.get("/api/v1/borrow-requests/my-requests", headers=borrower2_headers).json()
    req2_status = next(r for r in req2_check if r["id"] == req2["id"])
    assert req2_status["status"] == "rejected"
    assert "approved for another borrower" in req2_status["rejection_reason"]


def test_owner_can_update_resource_status(client, test_user, test_category):
    owner_headers = auth_headers(client, test_user.email, "Password123!")
    resource = create_resource(client, owner_headers, str(test_category.id))

    # Status is owner-controlled (e.g. taking a listing offline temporarily) --
    # it's no longer auto-mutated by the borrow lifecycle, so PUT must be able
    # to set it.
    update_payload = {
        "status": "unavailable",
        "title": "Updated Title"
    }
    resp = client.put(f"/api/v1/resources/{resource['id']}", headers=owner_headers, json=update_payload)

    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated Title"
    assert resp.json()["status"] == "unavailable"


import pytest

@pytest.mark.skip(reason="SQLite in-memory DB segfaults with concurrent with_for_update()")
def test_concurrent_approve_borrow_request(client, test_user, second_user, test_category):
    import concurrent.futures
    owner_headers = auth_headers(client, test_user.email, "Password123!")
    borrower_headers = auth_headers(client, second_user.email, "Password123!")

    resource = create_resource(client, owner_headers, str(test_category.id))
    
    # Create two borrow requests for the same resource
    req1_resp = request_borrow(client, borrower_headers, resource["id"])
    req2_resp = request_borrow(client, borrower_headers, resource["id"])
    
    req1_id = req1_resp.json()["id"]
    req2_id = req2_resp.json()["id"]
    
    # Fire both approvals concurrently
    def approve(req_id):
        # We need a new client session or just use the same test client
        # Fastapi TestClient is synchronous but thread-safe enough for this simulation
        return client.post(f"/api/v1/borrow-requests/{req_id}/approve", headers=owner_headers)
        
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(approve, req1_id)
        f2 = executor.submit(approve, req2_id)
        
        res1 = f1.result()
        res2 = f2.result()
        
    # One should succeed (200), one should fail (409) because quantity=1
    status_codes = {res1.status_code, res2.status_code}
    assert 200 in status_codes
    assert 409 in status_codes

