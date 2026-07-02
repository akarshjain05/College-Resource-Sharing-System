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

    # Borrower returns the item
    return_resp = client.post(f"/api/v1/borrow-requests/{request_id}/return", headers=borrower_headers, json={})
    assert return_resp.status_code == 200
    assert return_resp.json()["status"] == "returned"

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
