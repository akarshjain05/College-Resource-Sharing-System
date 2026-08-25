"""
Cryptographically secure OTP generation, HMAC-SHA256 hashing, and temporary storage service.
Uses Redis for OTP storage with an in-memory fallback for local development or testing.
"""
import hmac
import hashlib
import json
import logging
import secrets
import sys
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from app.core.config import settings
from app.core.exceptions import AppException

logger = logging.getLogger("crss")

# In-memory fallback dictionary when Redis is offline or during pytest runs
_in_memory_otp_store: Dict[str, Dict[str, Any]] = {}
_in_memory_email_index: Dict[str, str] = {}
_in_memory_cooldown_store: Dict[str, datetime] = {}


def _get_redis_client():
    if "pytest" in sys.modules:
        return None
    try:
        import redis
        client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1.0)
        client.ping()
        return client
    except Exception:
        logger.debug("Redis unavailable, falling back to in-memory OTP store.")
        return None


def generate_otp() -> str:
    """Generate a cryptographically secure 6-digit numeric OTP with leading zeros."""
    number = secrets.randbelow(1_000_000)
    return f"{number:06d}"


def hash_otp(otp: str) -> str:
    """Hash the OTP using HMAC-SHA256 with OTP_SECRET."""
    secret = (settings.OTP_SECRET or "default-otp-secret").encode("utf-8")
    return hmac.new(secret, otp.encode("utf-8"), hashlib.sha256).hexdigest()


def generate_challenge_id() -> str:
    """Generate a secure random challenge ID for the OTP transaction."""
    return str(uuid.uuid4())


def store_signup_otp(email: str, otp: str) -> tuple[str, int]:
    """
    Stores a signup verification OTP challenge.
    Invalidates any previous active signup OTP for this email.
    Returns (challenge_id, expires_in_seconds).
    """
    normalized_email = email.strip().lower()
    challenge_id = generate_challenge_id()
    hashed_otp = hash_otp(otp)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=settings.OTP_EXPIRY_SECONDS)

    payload = {
        "email": normalized_email,
        "otp_hash": hashed_otp,
        "purpose": "signup_verification",
        "attempts": 0,
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
    }

    client = _get_redis_client()
    if client:
        try:
            # Check for existing challenge for this email and invalidate it
            old_challenge_id = client.get(f"signup_otp_email:{normalized_email}")
            if old_challenge_id:
                client.delete(f"signup_otp:{old_challenge_id}")

            # Set new challenge and email mapping
            client.setex(f"signup_otp:{challenge_id}", settings.OTP_EXPIRY_SECONDS, json.dumps(payload))
            client.setex(f"signup_otp_email:{normalized_email}", settings.OTP_EXPIRY_SECONDS, challenge_id)
            client.setex(f"signup_otp_resend:{normalized_email}", settings.OTP_RESEND_COOLDOWN_SECONDS, "1")
            return challenge_id, settings.OTP_EXPIRY_SECONDS
        except Exception as exc:
            logger.warning("Redis store error: %s. Using in-memory fallback.", str(exc))

    # Fallback to in-memory store
    old_challenge_id = _in_memory_email_index.get(normalized_email)
    if old_challenge_id and old_challenge_id in _in_memory_otp_store:
        del _in_memory_otp_store[old_challenge_id]

    _in_memory_otp_store[challenge_id] = payload
    _in_memory_email_index[normalized_email] = challenge_id
    _in_memory_cooldown_store[normalized_email] = now + timedelta(seconds=settings.OTP_RESEND_COOLDOWN_SECONDS)

    return challenge_id, settings.OTP_EXPIRY_SECONDS


def check_resend_cooldown(email: str) -> bool:
    """Returns True if email is currently in resend cooldown."""
    normalized_email = email.strip().lower()
    client = _get_redis_client()
    if client:
        try:
            return bool(client.exists(f"signup_otp_resend:{normalized_email}"))
        except Exception as e:
            logger.warning(f"Handled exception: {e}")

    cooldown_until = _in_memory_cooldown_store.get(normalized_email)
    if cooldown_until:
        if datetime.now(timezone.utc) < cooldown_until:
            return True
        else:
            del _in_memory_cooldown_store[normalized_email]
    return False


def verify_signup_otp(challenge_id: str, submitted_otp: str) -> str:
    """
    Verifies a submitted signup OTP.
    Invalidates the OTP immediately on success or after max attempts.
    Returns the verified normalized email address.
    """
    client = _get_redis_client()
    payload = None

    if client:
        try:
            raw_data = client.get(f"signup_otp:{challenge_id}")
            if raw_data:
                payload = json.loads(raw_data)
        except Exception as exc:
            logger.warning("Redis read error: %s. Checking in-memory store.", str(exc))

    if not payload:
        payload = _in_memory_otp_store.get(challenge_id)

    if not payload:
        raise AppException("Invalid or expired verification code", status_code=400, error_code="INVALID_OTP")

    if payload.get("purpose") != "signup_verification":
        raise AppException("Invalid verification challenge purpose", status_code=400, error_code="INVALID_PURPOSE")

    attempts = payload.get("attempts", 0)
    if attempts >= settings.OTP_MAX_ATTEMPTS:
        # Invalidate OTP on max attempts
        delete_otp_challenge(challenge_id, payload.get("email"))
        raise AppException(
            "Maximum verification attempts exceeded. Please request a new code.",
            status_code=400,
            error_code="OTP_MAX_ATTEMPTS",
        )

    # Constant-time comparison of HMAC hashes
    submitted_hash = hash_otp(submitted_otp)
    stored_hash = payload.get("otp_hash", "")

    if not hmac.compare_digest(submitted_hash, stored_hash):
        # Increment attempt counter
        payload["attempts"] = attempts + 1
        new_attempts = payload["attempts"]

        if new_attempts >= settings.OTP_MAX_ATTEMPTS:
            delete_otp_challenge(challenge_id, payload.get("email"))
            raise AppException(
                "Maximum verification attempts exceeded. Please request a new code.",
                status_code=400,
                error_code="OTP_MAX_ATTEMPTS",
            )
        else:
            update_otp_challenge(challenge_id, payload)
            raise AppException("Invalid or expired verification code", status_code=400, error_code="INVALID_OTP")

    # Verification successful! Delete OTP challenge to prevent reuse.
    email = payload["email"]
    delete_otp_challenge(challenge_id, email)
    return email


def update_otp_challenge(challenge_id: str, payload: dict) -> None:
    client = _get_redis_client()
    if client:
        try:
            ttl = client.ttl(f"signup_otp:{challenge_id}")
            if ttl > 0:
                client.setex(f"signup_otp:{challenge_id}", ttl, json.dumps(payload))
                return
        except Exception as e:
            logger.warning(f"Handled exception: {e}")

    if challenge_id in _in_memory_otp_store:
        _in_memory_otp_store[challenge_id] = payload


def delete_otp_challenge(challenge_id: str, email: Optional[str] = None) -> None:
    client = _get_redis_client()
    if client:
        try:
            client.delete(f"signup_otp:{challenge_id}")
            if email:
                client.delete(f"signup_otp_email:{email}")
        except Exception as e:
            logger.warning(f"Handled exception: {e}")

    _in_memory_otp_store.pop(challenge_id, None)
    if email and _in_memory_email_index.get(email) == challenge_id:
        _in_memory_email_index.pop(email, None)


def resolve_email_from_challenge(challenge_id: str) -> Optional[str]:
    """Helper to find the email associated with a challenge ID."""
    client = _get_redis_client()
    if client:
        try:
            raw_data = client.get(f"signup_otp:{challenge_id}")
            if raw_data:
                data = json.loads(raw_data)
                return data.get("email")
        except Exception as e:
            logger.warning(f"Handled exception: {e}")

    payload = _in_memory_otp_store.get(challenge_id)
    if payload:
        return payload.get("email")
    return None
