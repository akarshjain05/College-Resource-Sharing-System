"""
Rate limiting via slowapi, backed by Redis so limits are shared across
multiple backend replicas rather than tracked per-process.
"""
import sys
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

is_testing = settings.ENVIRONMENT == "testing"

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.REDIS_URL,
    default_limits=["120/minute"],
    enabled=not is_testing,
    swallow_errors=True,
    in_memory_fallback_enabled=True,
    in_memory_fallback=["120/minute"]
)
