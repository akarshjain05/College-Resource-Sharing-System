import pytest
from tests.conftest import auth_headers

def test_update_notification_preference(client, test_user):
    headers = auth_headers(client, test_user.email, "Password123!")
    response = client.put(
        "/api/v1/users/me",
        headers=headers,
        json={"notif_resource_listing": False}
    )
    print("STATUS", response.status_code)
    print("RESPONSE", response.json())
    assert response.status_code == 200
    assert response.json()["notif_resource_listing"] is False
