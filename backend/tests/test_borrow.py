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
    start = date.today() + timedelta(days=1)
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

    # Resource should now show reduced availability
    resource_resp = client.get(f"/api/v1/resources/{resource['id']}")
    assert resource_resp.json()["quantity_available"] == 0
    assert resource_resp.json()["status"] == "borrowed"

    # Owner hands over the item
    handover_resp = client.post(f"/api/v1/borrow-requests/{request_id}/handover", headers=owner_headers)
    assert handover_resp.status_code == 200
    assert handover_resp.json()["status"] == "active"

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

    resource_resp_2 = client.get(f"/api/v1/resources/{resource['id']}")
    assert resource_resp_2.json()["quantity_available"] == 1
    assert resource_resp_2.json()["status"] == "available"


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


def test_put_resource_status_ignored(client, test_user, test_category):
    owner_headers = auth_headers(client, test_user.email, "Password123!")
    resource = create_resource(client, owner_headers, str(test_category.id))
    
    # Try to change status via PUT
    update_payload = {
        "status": "borrowed",
        "title": "Updated Title"
    }
    resp = client.put(f"/api/v1/resources/{resource['id']}", headers=owner_headers, json=update_payload)
    
    # The status field should be ignored (or raise 422 depending on Pydantic config, but we just check the end state)
    # The title should be updated, but status should remain "available"
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated Title"
    assert resp.json()["status"] == "available"


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
