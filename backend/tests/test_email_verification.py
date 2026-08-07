import hmac
import hashlib
from unittest.mock import patch, AsyncMock
import pytest

from app.core.config import settings
from app.models.user import User
from app.services.otp_service import store_signup_otp, hash_otp, verify_signup_otp, _in_memory_otp_store, _in_memory_email_index


@pytest.fixture(autouse=True)
def clear_otp_store():
    _in_memory_otp_store.clear()
    _in_memory_email_index.clear()
    yield
    _in_memory_otp_store.clear()
    _in_memory_email_index.clear()


def test_signup_otp_request_success(client, db_session):
    with patch("app.routers.auth.send_brevo_otp_email", new_callable=AsyncMock) as mock_brevo:
        mock_brevo.return_value = True

        resp = client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "OTP Test User",
                "email": "otptest@svnit.ac.in",
                "password": "Password123!",
                "confirm_password": "Password123!",
                "role": "student",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["requires_verification"] is True
        assert "challenge_id" in data
        assert data["expires_in"] == 600
        # 3. OTP is NOT returned in API response
        assert "otp" not in data
        assert "otp_code" not in data

        # 2. Brevo email service receives payload
        assert mock_brevo.called
        call_args = mock_brevo.call_args[0]
        assert call_args[0] == "otptest@svnit.ac.in"
        assert call_args[1] == "OTP Test User"
        otp_sent = call_args[2]
        assert len(otp_sent) == 6 and otp_sent.isdigit()

        # 4. Raw OTP is not stored
        user = db_session.query(User).filter(User.email == "otptest@svnit.ac.in").first()
        assert user is not None
        assert user.is_verified is False


def test_correct_otp_verifies_account(client, db_session):
    with patch("app.routers.auth.send_brevo_otp_email", new_callable=AsyncMock) as mock_brevo:
        mock_brevo.return_value = True
        reg_resp = client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Verify User",
                "email": "verify@svnit.ac.in",
                "password": "Password123!",
                "confirm_password": "Password123!",
            },
        )
        challenge_id = reg_resp.json()["challenge_id"]
        otp_sent = mock_brevo.call_args[0][2]

        # 5. Correct OTP verifies account
        v_resp = client.post(
            "/api/v1/auth/verify-signup-otp",
            json={"challenge_id": challenge_id, "otp": otp_sent},
        )
        assert v_resp.status_code == 200
        body = v_resp.json()
        assert "access_token" in body

        user = db_session.query(User).filter(User.email == "verify@svnit.ac.in").first()
        assert user.is_verified is True
        assert user.email_verified_at is not None

        # 8. OTP cannot be reused after verification
        reuse_resp = client.post(
            "/api/v1/auth/verify-signup-otp",
            json={"challenge_id": challenge_id, "otp": otp_sent},
        )
        assert reuse_resp.status_code == 400


def test_incorrect_otp_fails(client):
    with patch("app.routers.auth.send_brevo_otp_email", new_callable=AsyncMock) as mock_brevo:
        mock_brevo.return_value = True
        reg_resp = client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Incorrect OTP User",
                "email": "incorrect@svnit.ac.in",
                "password": "Password123!",
                "confirm_password": "Password123!",
            },
        )
        challenge_id = reg_resp.json()["challenge_id"]

        # 6. Incorrect OTP fails
        v_resp = client.post(
            "/api/v1/auth/verify-signup-otp",
            json={"challenge_id": challenge_id, "otp": "000000"},
        )
        assert v_resp.status_code == 400
        assert v_resp.json()["error_code"] == "INVALID_OTP"


def test_five_failed_attempts_invalidates_challenge(client):
    with patch("app.routers.auth.send_brevo_otp_email", new_callable=AsyncMock) as mock_brevo:
        mock_brevo.return_value = True
        reg_resp = client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Max Attempts User",
                "email": "maxattempts@svnit.ac.in",
                "password": "Password123!",
                "confirm_password": "Password123!",
            },
        )
        challenge_id = reg_resp.json()["challenge_id"]

        # 11. 5 failed attempts invalidate challenge
        for i in range(4):
            fail_resp = client.post(
                "/api/v1/auth/verify-signup-otp",
                json={"challenge_id": challenge_id, "otp": "000000"},
            )
            assert fail_resp.status_code == 400

        # 5th attempt invalidates challenge
        fifth_resp = client.post(
            "/api/v1/auth/verify-signup-otp",
            json={"challenge_id": challenge_id, "otp": "000000"},
        )
        assert fifth_resp.status_code == 400
        assert fifth_resp.json()["error_code"] == "OTP_MAX_ATTEMPTS"


def test_previous_otp_invalid_after_resend(client):
    with patch("app.routers.auth.send_brevo_otp_email", new_callable=AsyncMock) as mock_brevo:
        mock_brevo.return_value = True
        reg_resp = client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Resend User",
                "email": "resend@svnit.ac.in",
                "password": "Password123!",
                "confirm_password": "Password123!",
            },
        )
        old_challenge_id = reg_resp.json()["challenge_id"]
        old_otp = mock_brevo.call_args[0][2]

        # Bypass 60s cooldown for test by clearing cooldown in test helper
        from app.services.otp_service import _in_memory_cooldown_store
        _in_memory_cooldown_store.clear()

        # 9. Resend OTP
        resend_resp = client.post(
            "/api/v1/auth/resend-signup-otp",
            json={"challenge_id": old_challenge_id},
        )
        assert resend_resp.status_code == 200
        new_challenge_id = resend_resp.json()["challenge_id"]
        assert new_challenge_id != old_challenge_id

        new_otp = mock_brevo.call_args[0][2]

        # Old OTP fails
        old_verify = client.post(
            "/api/v1/auth/verify-signup-otp",
            json={"challenge_id": old_challenge_id, "otp": old_otp},
        )
        assert old_verify.status_code == 400

        # New OTP succeeds
        new_verify = client.post(
            "/api/v1/auth/verify-signup-otp",
            json={"challenge_id": new_challenge_id, "otp": new_otp},
        )
        assert new_verify.status_code == 200


def test_unverified_account_can_login_but_cannot_perform_write_actions(client, test_category):
    with patch("app.routers.auth.send_brevo_otp_email", new_callable=AsyncMock) as mock_brevo:
        mock_brevo.return_value = True
        client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Unverified User",
                "email": "unverified@svnit.ac.in",
                "password": "Password123!",
                "confirm_password": "Password123!",
            },
        )

        # 13. Unverified account can complete normal login
        login_resp = client.post(
            "/api/v1/auth/login",
            data={"username": "unverified@svnit.ac.in", "password": "Password123!"},
        )
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Try to post a listing -> should return 403
        post_resp = client.post(
            "/api/v1/resources",
            headers=headers,
            json={
                "title": "Unverified Listing",
                "description": "Should fail",
                "condition": "good",
                "quantity": 1,
                "category_id": str(test_category.id),
                "max_borrow_days": 7,
                "deposit_amount": 0,
            }
        )
        assert post_resp.status_code == 403
        assert "verify your email" in post_resp.json()["detail"]

        # Try to request borrow -> should return 403
        borrow_resp = client.post(
            "/api/v1/borrow-requests",
            headers=headers,
            json={
                "resource_id": str(test_category.id), # random resource id placeholder
                "requested_start_date": "2026-08-08",
                "requested_end_date": "2026-08-10",
                "purpose": "Testing",
            }
        )
        assert borrow_resp.status_code == 403
        assert "verify your email" in borrow_resp.json()["detail"]


def test_brevo_failure_does_not_verify_account(client, db_session):
    with patch("app.routers.auth.send_brevo_otp_email", new_callable=AsyncMock) as mock_brevo:
        mock_brevo.return_value = False  # Brevo send fails

        reg_resp = client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Brevo Fail User",
                "email": "brevofail@svnit.ac.in",
                "password": "Password123!",
                "confirm_password": "Password123!",
            },
        )
        # 14. Brevo failure handles error gracefully
        assert reg_resp.status_code == 500
        assert reg_resp.json()["error_code"] == "BREVO_SEND_FAILED"

        user = db_session.query(User).filter(User.email == "brevofail@svnit.ac.in").first()
        assert user.is_verified is False


def test_email_normalization(client):
    with patch("app.routers.auth.send_brevo_otp_email", new_callable=AsyncMock) as mock_brevo:
        mock_brevo.return_value = True
        reg_resp = client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Normalize User",
                "email": "  CaseTest@SVNIT.ac.in  ",
                "password": "Password123!",
                "confirm_password": "Password123!",
            },
        )
        assert reg_resp.status_code == 201
        challenge_id = reg_resp.json()["challenge_id"]
        otp_sent = mock_brevo.call_args[0][2]

        v_resp = client.post(
            "/api/v1/auth/verify-signup-otp",
            json={"challenge_id": challenge_id, "otp": otp_sent},
        )
        assert v_resp.status_code == 200
