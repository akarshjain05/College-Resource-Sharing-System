from datetime import date, timedelta
from tests.conftest import auth_headers


def create_resource(client, headers, category_id):
    payload = {
        "title": "Test Item for Review",
        "description": "This is a test description.",
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
            "purpose": "Testing reviews",
        },
    )


def test_review_without_borrow(client, test_user, second_user, test_category):
    owner_headers = auth_headers(client, test_user.email, "Password123!")
    borrower_headers = auth_headers(client, second_user.email, "Password123!")

    resource = create_resource(client, owner_headers, str(test_category.id))

    # Try to review without borrowing
    resp = client.post(
        "/api/v1/reviews",
        headers=borrower_headers,
        json={"resource_id": resource["id"], "rating": 5, "comment": "Nice!"},
    )
    assert resp.status_code == 400
    assert "borrowed previously" in resp.json()["detail"]


def test_review_with_pending_borrow(client, test_user, second_user, test_category):
    owner_headers = auth_headers(client, test_user.email, "Password123!")
    borrower_headers = auth_headers(client, second_user.email, "Password123!")

    resource = create_resource(client, owner_headers, str(test_category.id))

    # Request but not approved
    req_resp = request_borrow(client, borrower_headers, resource["id"])
    assert req_resp.status_code == 201

    # Try to review
    resp = client.post(
        "/api/v1/reviews",
        headers=borrower_headers,
        json={"resource_id": resource["id"], "rating": 4, "comment": "Great!"},
    )
    assert resp.status_code == 400
    assert "borrowed previously" in resp.json()["detail"]


def test_review_limitations_and_lifecycle(client, test_user, second_user, test_category):
    owner_headers = auth_headers(client, test_user.email, "Password123!")
    borrower_headers = auth_headers(client, second_user.email, "Password123!")

    resource = create_resource(client, owner_headers, str(test_category.id))

    # 1. First Borrow Lifecycle
    req_resp = request_borrow(client, borrower_headers, resource["id"])
    req_id = req_resp.json()["id"]
    client.post(f"/api/v1/borrow-requests/{req_id}/approve", headers=owner_headers)
    client.post(f"/api/v1/borrow-requests/{req_id}/return", headers=borrower_headers, json={})

    # Submit review -> Should succeed
    resp1 = client.post(
        "/api/v1/reviews",
        headers=borrower_headers,
        json={"resource_id": resource["id"], "rating": 5, "comment": "Awesome!"},
    )
    assert resp1.status_code == 201

    # Try to review again -> Should fail (already reviewed this borrow)
    resp2 = client.post(
        "/api/v1/reviews",
        headers=borrower_headers,
        json={"resource_id": resource["id"], "rating": 4, "comment": "Again!"},
    )
    assert resp2.status_code == 400
    assert "one review per successful borrow" in resp2.json()["detail"]

    # 2. Second Borrow Lifecycle
    req_resp2 = request_borrow(client, borrower_headers, resource["id"])
    req_id2 = req_resp2.json()["id"]
    client.post(f"/api/v1/borrow-requests/{req_id2}/approve", headers=owner_headers)
    client.post(f"/api/v1/borrow-requests/{req_id2}/return", headers=borrower_headers, json={})

    # Submit review again -> Should succeed now
    resp3 = client.post(
        "/api/v1/reviews",
        headers=borrower_headers,
        json={"resource_id": resource["id"], "rating": 4, "comment": "Second time is great!"},
    )
    assert resp3.status_code == 201

    # Try to review third time -> Should fail
    resp4 = client.post(
        "/api/v1/reviews",
        headers=borrower_headers,
        json={"resource_id": resource["id"], "rating": 3, "comment": "Third time!"},
    )
    assert resp4.status_code == 400
    assert "one review per successful borrow" in resp4.json()["detail"]
