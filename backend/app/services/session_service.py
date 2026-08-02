import logging
from app.core.config import settings

logger = logging.getLogger("crss")

def _get_redis_client():
    try:
        from app.services.otp_service import _get_redis_client
        return _get_redis_client()
    except ImportError:
        return None

def store_refresh_token(user_id: str, token: str):
    client = _get_redis_client()
    if client:
        client.setex(f"refresh_tokens:{user_id}:{token}", settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400, "1")

def revoke_refresh_token(user_id: str, token: str):
    client = _get_redis_client()
    if client:
        client.delete(f"refresh_tokens:{user_id}:{token}")

def revoke_all_refresh_tokens(user_id: str):
    client = _get_redis_client()
    if client:
        keys = client.keys(f"refresh_tokens:{user_id}:*")
        if keys:
            client.delete(*keys)

def rotate_refresh_token(user_id: str, old_token: str, new_token: str) -> bool:
    """
    Returns True if rotation was successful.
    Returns False if the old token was not found (indicating reuse/theft or expiration).
    """
    client = _get_redis_client()
    if client:
        exists = client.exists(f"refresh_tokens:{user_id}:{old_token}")
        if not exists:
            # Rotate-on-reuse detection: revoke all sessions
            revoke_all_refresh_tokens(user_id)
            return False
        client.delete(f"refresh_tokens:{user_id}:{old_token}")
        client.setex(f"refresh_tokens:{user_id}:{new_token}", settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400, "1")
        return True
    return True  # Fallback if Redis is offline
