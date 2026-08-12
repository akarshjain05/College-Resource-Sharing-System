import pytest
from tests.conftest import auth_headers
from app.models.misc import Complaint

def test_update_complaint(client, admin_user, db_session, test_user):
    # Create a real complaint in the DB
    complaint = Complaint(
        filed_by_id=test_user.id,
        subject="Test subject",
        description="Test desc"
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

