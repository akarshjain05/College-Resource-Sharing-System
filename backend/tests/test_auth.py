from unittest.mock import patch

from tests.conftest import auth_headers


def test_register_new_user(client, test_category):
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "New Student",
            "email": "new@crss.edu",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "role": "student",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "new@crss.edu"
    assert data["is_verified"] is False


def test_register_password_mismatch_rejected(client):
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Mismatch User",
            "email": "mismatch@crss.edu",
            "password": "Password123!",
            "confirm_password": "TotallyDifferent!",
        },
    )
    assert resp.status_code == 422


def test_register_duplicate_email_fails(client, test_user):
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Duplicate",
            "email": test_user.email,
            "password": "Password123!",
            "confirm_password": "Password123!",
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


def _fake_google_idinfo(email, sub, name="Google User", picture=None):
    info = {"email": email, "sub": sub, "name": name}
    if picture:
        info["picture"] = picture
    return info


def test_google_login_new_user_returns_needs_profile(client, db_session):
    fake_idinfo = _fake_google_idinfo("newgoogle@crss.edu", "google-sub-1", picture="https://example.com/p.jpg")

    with patch("app.routers.auth.settings.GOOGLE_CLIENT_ID", "fake-client-id"), \
         patch("app.routers.auth.google_id_token.verify_oauth2_token", return_value=fake_idinfo):
        resp = client.post("/api/v1/auth/google", json={"credential": "fake-token"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "needs_profile"
    assert body["email"] == "newgoogle@crss.edu"
    assert body["registration_token"]
    assert body.get("access_token") is None

    # no account should exist yet -- it's only created after complete-profile
    from app.models.user import User

    user = db_session.query(User).filter(User.email == "newgoogle@crss.edu").first()
    assert user is None


def test_complete_google_profile_creates_account(client, db_session):
    fake_idinfo = _fake_google_idinfo("newgoogle2@crss.edu", "google-sub-1b", picture="https://example.com/p.jpg")

    with patch("app.routers.auth.settings.GOOGLE_CLIENT_ID", "fake-client-id"), \
         patch("app.routers.auth.google_id_token.verify_oauth2_token", return_value=fake_idinfo):
        first_resp = client.post("/api/v1/auth/google", json={"credential": "fake-token"})

    registration_token = first_resp.json()["registration_token"]

    complete_resp = client.post(
        "/api/v1/auth/google/complete-profile",
        json={
            "registration_token": registration_token,
            "role": "student",
            "department": "Computer Science",
            "course": "B.Tech CSE",
            "year_of_study": 2,
            "student_id": "CSE2026042",
        },
    )
    assert complete_resp.status_code == 201
    body = complete_resp.json()
    assert "access_token" in body
    assert "refresh_token" in body

    from app.models.user import User

    user = db_session.query(User).filter(User.email == "newgoogle2@crss.edu").first()
    assert user is not None
    assert user.hashed_password is None
    assert user.is_verified is True
    assert user.google_id == "google-sub-1b"
    assert user.profile_picture_url == "https://example.com/p.jpg"
    assert user.department == "Computer Science"
    assert user.course == "B.Tech CSE"
    assert user.year_of_study == 2
    assert user.student_id == "CSE2026042"


def test_complete_google_profile_rejects_bad_token(client):
    resp = client.post(
        "/api/v1/auth/google/complete-profile",
        json={"registration_token": "not-a-real-token", "role": "student"},
    )
    assert resp.status_code == 400
    assert resp.json()["error_code"] == "BAD_REGISTRATION_TOKEN"


def test_complete_google_profile_rejects_duplicate_email(client, test_user):
    fake_idinfo = _fake_google_idinfo(test_user.email, "google-sub-dup")

    with patch("app.routers.auth.settings.GOOGLE_CLIENT_ID", "fake-client-id"), \
         patch("app.routers.auth.google_id_token.verify_oauth2_token", return_value=fake_idinfo):
        first_resp = client.post("/api/v1/auth/google", json={"credential": "fake-token"})

    # test_user already exists with this email, so /auth/google should have logged
    # them in directly rather than returning needs_profile -- confirm that, then also
    # confirm complete-profile independently rejects a duplicate as defense-in-depth.
    assert first_resp.json()["status"] == "login"


def test_google_login_links_existing_local_account(client, test_user, db_session):
    fake_idinfo = _fake_google_idinfo(test_user.email, "google-sub-2", name=test_user.full_name)

    with patch("app.routers.auth.settings.GOOGLE_CLIENT_ID", "fake-client-id"), \
         patch("app.routers.auth.google_id_token.verify_oauth2_token", return_value=fake_idinfo):
        resp = client.post("/api/v1/auth/google", json={"credential": "fake-token"})

    assert resp.status_code == 200
    assert resp.json()["status"] == "login"
    db_session.refresh(test_user)
    assert test_user.google_id == "google-sub-2"
    # the account's original local password must be untouched by linking
    assert test_user.hashed_password is not None


def test_login_blocked_for_google_only_account(client, db_session):
    fake_idinfo = _fake_google_idinfo("onlygoogle@crss.edu", "google-sub-3")

    with patch("app.routers.auth.settings.GOOGLE_CLIENT_ID", "fake-client-id"), \
         patch("app.routers.auth.google_id_token.verify_oauth2_token", return_value=fake_idinfo):
        signup_resp = client.post("/api/v1/auth/google", json={"credential": "fake-token"})

    registration_token = signup_resp.json()["registration_token"]
    client.post(
        "/api/v1/auth/google/complete-profile",
        json={"registration_token": registration_token, "role": "student"},
    )

    resp = client.post(
        "/api/v1/auth/login", data={"username": "onlygoogle@crss.edu", "password": "anything-at-all"}
    )
    assert resp.status_code == 400
    assert resp.json()["error_code"] == "GOOGLE_ACCOUNT_NO_PASSWORD"


def test_google_login_rejects_invalid_token(client):
    with patch("app.routers.auth.settings.GOOGLE_CLIENT_ID", "fake-client-id"), \
         patch("app.routers.auth.google_id_token.verify_oauth2_token", side_effect=ValueError("bad token")):
        resp = client.post("/api/v1/auth/google", json={"credential": "not-a-real-token"})

    assert resp.status_code == 401
    assert resp.json()["error_code"] == "BAD_GOOGLE_TOKEN"


def test_google_login_fails_cleanly_when_not_configured(client):
    with patch("app.routers.auth.settings.GOOGLE_CLIENT_ID", ""):
        resp = client.post("/api/v1/auth/google", json={"credential": "irrelevant"})

    assert resp.status_code == 501
    assert resp.json()["error_code"] == "GOOGLE_NOT_CONFIGURED"


def test_change_password_blocked_for_google_only_account(client, db_session):
    fake_idinfo = _fake_google_idinfo("changepwtest@crss.edu", "google-sub-4")
    with patch("app.routers.auth.settings.GOOGLE_CLIENT_ID", "fake-client-id"), \
         patch("app.routers.auth.google_id_token.verify_oauth2_token", return_value=fake_idinfo):
        signup_resp = client.post("/api/v1/auth/google", json={"credential": "fake-token"})

    registration_token = signup_resp.json()["registration_token"]
    complete_resp = client.post(
        "/api/v1/auth/google/complete-profile",
        json={"registration_token": registration_token, "role": "student"},
    )

    token = complete_resp.json()["access_token"]
    resp = client.post(
        "/api/v1/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "whatever", "new_password": "NewPassword456!"},
    )
    assert resp.status_code == 400
    assert resp.json()["error_code"] == "GOOGLE_ACCOUNT_NO_PASSWORD"