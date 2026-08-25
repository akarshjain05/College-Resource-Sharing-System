import json
import logging
import sys
from typing import Dict, List, Optional
from app.core.config import settings

logger = logging.getLogger("crss")

# In-memory presence fallback when Redis is unreachable or in tests
_in_memory_presence: Dict[str, str] = {}


def get_redis_client():
    if "pytest" in sys.modules:
        return None
    try:
        import redis
        client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1.0)
        client.ping()
        return client
    except Exception as exc:
        logger.debug("Redis unavailable for presence, using fallback: %s", str(exc))
        return None


def set_user_presence(user_id: str, status: str) -> bool:
    """
    Sets a user's presence status in Upstash / Redis.
    Keys set:
      - presence:<user_id> = "online" | "offline"
      - Hash `user_presence` -> field <user_id> = "online" | "offline"
    Also publishes to Redis Pub/Sub channel `presence_updates`.
    """
    _in_memory_presence[user_id] = status
    client = get_redis_client()
    if not client:
        return False

    try:
        pipe = client.pipeline()
        pipe.set(f"presence:{user_id}", status)
        pipe.hset("user_presence", user_id, status)
        pipe.publish("presence_updates", json.dumps({"user_id": user_id, "status": status}))
        pipe.execute()
        logger.info("Redis presence updated for user %s: %s", user_id, status)
        return True
    except Exception as exc:
        logger.warning("Failed to update Redis presence for user %s: %s", user_id, exc)
        return False


def get_user_presence(user_id: str) -> str:
    """Returns 'online' or 'offline' for a given user ID."""
    client = get_redis_client()
    if client:
        try:
            status = client.get(f"presence:{user_id}")
            if status:
                return status
        except Exception as e:
            logger.warning(f"Handled exception: {e}")
    return _in_memory_presence.get(user_id, "offline")


def get_all_presences() -> Dict[str, str]:
    """Returns a dictionary of all active user presences in Redis."""
    client = get_redis_client()
    if client:
        try:
            return client.hgetall("user_presence") or {}
        except Exception as e:
            logger.warning(f"Handled exception: {e}")
    return _in_memory_presence
