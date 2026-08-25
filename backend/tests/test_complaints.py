from datetime import datetime, timezone, timedelta

from tests.conftest import auth_headers


def test_complaints_with_linked_borrow_request(client, test_user, second_user, test_category):
    user_headers = auth_headers(client, test_user.email, "Password123!")
    other_headers = auth_headers(client, second_user.email, "Password123!")

    # Create a resource owned by test_user
    res_resp = client.post(
        "/api/v1/resources",
        headers=user_headers,
        json={
            "title": "Camera for Complaint Test",
            "description": "High resolution camera",
            "category_id": str(test_category.id),
            "quantity": 1,
        },
    )
    assert res_resp.status_code == 201
    resource_id = res_resp.json()["id"]

    # second_user requests to borrow the resource
    start = datetime.now(timezone.utc)
    end = start + timedelta(days=2)
    borrow_resp = client.post(
        "/api/v1/borrow-requests",
        headers=other_headers,
        json={
            "resource_id": resource_id,
            "requested_start_date": start.isoformat(),
            "requested_end_date": end.isoformat(),
            "purpose": "Event photoshoot",
        },
    )
    assert borrow_resp.status_code == 201
    borrow_request_id = borrow_resp.json()["id"]

    # test_user files a complaint linked to the borrow request
    complaint_resp = client.post(
        "/api/v1/complaints",
        headers=user_headers,
        json={
            "category": "dispute",
            "subject": "Late return issue",
            "description": "The item was not returned on time by borrower",
            "against_user_id": str(second_user.id),
            "resource_id": resource_id,
            "borrow_request_id": borrow_request_id,
        },
    )
    assert complaint_resp.status_code == 201
    comp_data = complaint_resp.json()
    assert comp_data["subject"] == "Late return issue"
    assert comp_data["borrow_request"] is not None
    assert comp_data["borrow_request"]["id"] == borrow_request_id
    assert "start_date" in comp_data["borrow_request"]
    assert "end_date" in comp_data["borrow_request"]

    # Test my-complaints endpoint (GET /api/v1/complaints/my-complaints)
    my_complaints_resp = client.get(
        "/api/v1/complaints/my-complaints",
        headers=user_headers,
    )
    assert my_complaints_resp.status_code == 200
    my_complaints_data = my_complaints_resp.json()
    assert len(my_complaints_data) == 1
    assert my_complaints_data[0]["subject"] == "Late return issue"
    assert my_complaints_data[0]["borrow_request"] is not None
    assert my_complaints_data[0]["borrow_request"]["id"] == borrow_request_id
    assert "start_date" in my_complaints_data[0]["borrow_request"]
    assert "end_date" in my_complaints_data[0]["borrow_request"]

def test_update_complaint(client, admin_user, db_session, test_user):
    # Ensure admin has complaint resolution permission
    admin_user.can_moderate_complaints = True
    db_session.commit()

    from app.models.misc import Complaint
    # Create a real complaint in the DB
    complaint = Complaint(
        filed_by_id=test_user.id,
        subject="Test subject",
        description="Test desc",
        status="open",
        category="general"
    )
    db_session.add(complaint)
    db_session.commit()

    headers = auth_headers(client, admin_user.email, "AdminPass123!")
    response = client.put(
        f"/api/v1/complaints/{complaint.id}",
        headers=headers,
        json={
            "status": "resolved",
            "admin_response": "Test notes",
            "resolution_action": "refund_issued",
            "resolution_amount": 200,
            "resolution_notes": "Test notes",
            "trust_score_penalty": None
        }
    )
    assert response.status_code == 200
    
    db_session.refresh(complaint)
    assert complaint.status.value == "resolved"
    assert complaint.admin_response == "Test notes"

