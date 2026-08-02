"""
Rate limiting via slowapi, backed by Redis so limits are shared across
multiple backend replicas rather than tracked per-process.
"""
import sys
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

is_testing = "pytest" in sys.modules

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.REDIS_URL,
    default_limits=["120/minute"],
    enabled=not is_testing,
)
