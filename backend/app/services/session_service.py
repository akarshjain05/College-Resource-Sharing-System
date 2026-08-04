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
        # Clear any global revocation flag upon fresh login
        client.delete(f"user_revoked_all:{user_id}")
        client.setex(f"refresh_tokens:{user_id}:{token}", settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400, "1")

def revoke_refresh_token(user_id: str, token: str):
    client = _get_redis_client()
    if client:
        client.delete(f"refresh_tokens:{user_id}:{token}")
        client.setex(f"revoked_tokens:{token}", settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400, "1")

def revoke_all_refresh_tokens(user_id: str):
    client = _get_redis_client()
    if client:
        client.setex(f"user_revoked_all:{user_id}", settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400, "1")
        keys = client.keys(f"refresh_tokens:{user_id}:*")
        if keys:
            client.delete(*keys)

def rotate_refresh_token(user_id: str, old_token: str, new_token: str) -> bool:
    """
    Returns True if rotation was successful.
    Returns False ONLY if the old token was explicitly revoked.
    """
    client = _get_redis_client()
    if client:
        # Check if explicitly revoked
        if client.exists(f"revoked_tokens:{old_token}") or client.exists(f"user_revoked_all:{user_id}"):
            return False
        # Store new token
        client.setex(f"refresh_tokens:{user_id}:{new_token}", settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400, "1")
        # Keep old token with a 60-second grace window to prevent concurrent tab refresh races from logging out
        client.expire(f"refresh_tokens:{user_id}:{old_token}", 60)
        return True
    return True
