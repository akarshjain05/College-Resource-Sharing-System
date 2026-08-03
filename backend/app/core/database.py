"""
SQLAlchemy engine, session factory, and declarative base.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

import logging
from sqlalchemy import create_engine, event

logger = logging.getLogger(__name__)

engine_kwargs = {"pool_pre_ping": True}
if not settings.DATABASE_URL.startswith("sqlite"):
    engine_kwargs.update({"pool_size": 10, "max_overflow": 20})
    engine_kwargs["connect_args"] = {"options": "-c statement_timeout=30000"}
    
    # Enforce sslmode=require for external production DBs (not local docker 'db' or 'localhost')
    if "sslmode=" not in settings.DATABASE_URL and "localhost" not in settings.DATABASE_URL and "@db:" not in settings.DATABASE_URL:
        engine_kwargs["connect_args"]["sslmode"] = "require"
else:
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    **engine_kwargs
)

if not settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "checkout")
    def checkout_listener(dbapi_connection, connection_record, connection_proxy):
        pool = engine.pool
        if pool.size() > 0:
            saturation = pool.checkedin() / pool.size()
            if saturation < 0.2:  # Less than 20% connections available (80% saturated)
                logger.warning(f"Database connection pool saturation high! Available: {pool.checkedin()}/{pool.size()}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
