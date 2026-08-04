"""
Campus Resource Sharing System - FastAPI application entrypoint.
"""
import os

from contextlib import asynccontextmanager
import asyncio

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
    admin_management,
    uploads,
    complaints,
    damage_claims,
    wanted,
    wishlist,
    websocket,
    chat,
    health,
    payments,
)
from app.middleware.csrf import CSRFMiddleware
from app.middleware.limit_body_size import ContentSizeLimitMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.services.ws_manager import manager

configure_logging(debug=settings.DEBUG)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Capture the running event loop so ws_manager can schedule coroutines
    # from synchronous route handlers via asyncio.run_coroutine_threadsafe.
    # Must be done in an async context so asyncio.get_running_loop() is valid.
    manager.bind_loop(asyncio.get_running_loop())
    if settings.ENVIRONMENT == "development":
        Base.metadata.create_all(bind=engine)
    yield
    # (cleanup on shutdown can go here if needed)


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="A secure, campus-only platform for students, faculty, and clubs to lend and borrow resources.",
    version="1.0.0",
    docs_url=None if settings.ENVIRONMENT == "production" else "/docs",
    redoc_url=None if settings.ENVIRONMENT == "production" else "/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(ContentSizeLimitMiddleware, max_content_size=2 * 1024 * 1024) # 2MB limit for JSON bodies

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token"],
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
app.include_router(admin_management.router, prefix=API_PREFIX)
app.include_router(uploads.router, prefix=API_PREFIX)
app.include_router(complaints.router, prefix=API_PREFIX)
app.include_router(damage_claims.router, prefix="/api/v1")
app.include_router(wanted.router, prefix="/api/v1")
app.include_router(wishlist.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(websocket.router, prefix="/api/v1")
app.include_router(payments.router, prefix=API_PREFIX)


# Startup logic moved to the lifespan context manager above.


@app.get("/")
def root():
    return {
        "message": "Welcome to the Campus Resource Sharing System API",
        "docs": "/docs",
        "health": "/health",
    }
