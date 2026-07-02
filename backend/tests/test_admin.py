from tests.conftest import auth_headers


def test_non_admin_cannot_list_users(client, test_user):
    headers = auth_headers(client, test_user.email, "Password123!")
    resp = client.get("/api/v1/users", headers=headers)
    assert resp.status_code == 403


def test_admin_can_list_users(client, admin_user, test_user):
    headers = auth_headers(client, admin_user.email, "AdminPass123!")
    resp = client.get("/api/v1/users", headers=headers)
    assert resp.status_code == 200
    emails = [u["email"] for u in resp.json()]
    assert admin_user.email in emails
    assert test_user.email in emails


def test_admin_can_suspend_and_unsuspend_user(client, admin_user, test_user):
    headers = auth_headers(client, admin_user.email, "AdminPass123!")

    suspend_resp = client.post(f"/api/v1/users/{test_user.id}/suspend", headers=headers)
    assert suspend_resp.status_code == 200
    assert suspend_resp.json()["is_suspended"] is True

    # Suspended user can no longer log in
    login_resp = client.post(
        "/api/v1/auth/login", data={"username": test_user.email, "password": "Password123!"}
    )
    assert login_resp.status_code == 403

    unsuspend_resp = client.post(f"/api/v1/users/{test_user.id}/unsuspend", headers=headers)
    assert unsuspend_resp.status_code == 200
    assert unsuspend_resp.json()["is_suspended"] is False


def test_admin_analytics_overview(client, admin_user):
    headers = auth_headers(client, admin_user.email, "AdminPass123!")
    resp = client.get("/api/v1/admin/analytics/overview", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "total_users" in body
    assert "total_resources" in body


def test_category_crud_admin_only(client, admin_user, test_user):
    student_headers = auth_headers(client, test_user.email, "Password123!")
    resp = client.post("/api/v1/categories", json={"name": "Lab Equipment"}, headers=student_headers)
    assert resp.status_code == 403

    admin_headers = auth_headers(client, admin_user.email, "AdminPass123!")
    resp2 = client.post("/api/v1/categories", json={"name": "Lab Equipment"}, headers=admin_headers)
    assert resp2.status_code == 201
    assert resp2.json()["slug"] == "lab-equipment"
