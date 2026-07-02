from tests.conftest import auth_headers


def test_register_new_user(client, test_category):
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "New Student",
            "email": "new@crss.edu",
            "password": "Password123!",
            "role": "student",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "new@crss.edu"
    assert data["is_verified"] is False


def test_register_duplicate_email_fails(client, test_user):
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Duplicate",
            "email": test_user.email,
            "password": "Password123!",
        },
    )
    assert resp.status_code == 409


def test_login_success(client, test_user):
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": test_user.email, "password": "Password123!"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert "refresh_token" in body


def test_login_wrong_password_fails(client, test_user):
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": test_user.email, "password": "WrongPassword!"},
    )
    assert resp.status_code == 401


def test_get_me_requires_token(client):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_get_me_with_token(client, test_user):
    headers = auth_headers(client, test_user.email, "Password123!")
    resp = client.get("/api/v1/auth/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == test_user.email


def test_change_password(client, test_user):
    headers = auth_headers(client, test_user.email, "Password123!")
    resp = client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={"current_password": "Password123!", "new_password": "NewPassword456!"},
    )
    assert resp.status_code == 204

    # old password should no longer work
    old_login = client.post(
        "/api/v1/auth/login", data={"username": test_user.email, "password": "Password123!"}
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/api/v1/auth/login", data={"username": test_user.email, "password": "NewPassword456!"}
    )
    assert new_login.status_code == 200
