"""
Campus Resource Sharing System - FastAPI application entrypoint.
"""
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.core.config import settings
from app.core.database import Base, engine
from app.core.exceptions import register_exception_handlers
from app.core.logging_config import configure_logging
from app.core.rate_limit import limiter
from app.models import *  # noqa: F401,F403  ensures all models are registered on Base

from app.routers import (
    auth,
    users,
    categories,
    resources,
    borrow,
    reviews,
    admin_analytics,
    uploads,
    complaints,
    damage_claims,
    wanted,
    wishlist,
    websocket,
    health,
)
from app.middleware.csrf import CSRFMiddleware
from app.services.ws_manager import manager

configure_logging(debug=settings.DEBUG)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="A secure, campus-only platform for students, faculty, and clubs to lend and borrow resources.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(CSRFMiddleware)

register_exception_handlers(app)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

API_PREFIX = settings.API_V1_PREFIX
app.include_router(health.router)
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(categories.router, prefix=API_PREFIX)
app.include_router(resources.router, prefix=API_PREFIX)
app.include_router(borrow.router, prefix=API_PREFIX)
app.include_router(reviews.router, prefix=API_PREFIX)
app.include_router(admin_analytics.router, prefix=API_PREFIX)
app.include_router(uploads.router, prefix=API_PREFIX)
app.include_router(complaints.router, prefix=API_PREFIX)
app.include_router(damage_claims.router, prefix="/api/v1")
app.include_router(wanted.router, prefix="/api/v1")
app.include_router(wishlist.router, prefix="/api/v1")
app.include_router(websocket.router, prefix="/api/v1")


@app.on_event("startup")
def on_startup():
    # In development, auto-create tables if they don't already exist.
    # In production, Alembic migrations should be the source of truth (see alembic/).
    if settings.ENVIRONMENT == "development":
        Base.metadata.create_all(bind=engine)

    import asyncio
    manager.bind_loop(asyncio.get_event_loop())


@app.get("/")
def root():
    return {
        "message": "Welcome to the Campus Resource Sharing System API",
        "docs": "/docs",
        "health": "/health",
    }
