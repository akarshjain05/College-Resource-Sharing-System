"""
CSRF protection via the double-submit-cookie pattern.

CRSS's primary API auth is a JWT Bearer token in the Authorization header, which
is not automatically attached by the browser the way cookies are — so classic
CSRF (a malicious site tricking a victim's browser into firing an authenticated
request) does not apply to those calls. This middleware exists as defense-in-depth
for any cookie-based flows (e.g. if a future admin web console uses session
cookies): any state-changing request that is NOT authenticated via an
Authorization header must present a matching `X-CSRF-Token` header and
`csrf_token` cookie.
"""
import secrets

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "x-csrf-token"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}


class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        existing_token = request.cookies.get(CSRF_COOKIE_NAME)

        # Bearer-token requests (the normal API path) are not vulnerable to CSRF
        # since browsers never attach Authorization headers automatically.
        is_bearer_request = request.headers.get("authorization", "").lower().startswith("bearer ")

        if (
            request.method not in SAFE_METHODS
            and not is_bearer_request
            and existing_token is not None
        ):
            submitted_token = request.headers.get(CSRF_HEADER_NAME)
            if not submitted_token or not secrets.compare_digest(submitted_token, existing_token):
                return JSONResponse(
                    status_code=403,
                    content={"detail": "CSRF token missing or invalid", "error_code": "CSRF_FAILURE"},
                )

        response = await call_next(request)

        if existing_token is None:
            new_token = secrets.token_urlsafe(32)
            response.set_cookie(
                CSRF_COOKIE_NAME,
                new_token,
                httponly=False,  # must be readable by JS to echo back in the header
                samesite="strict",
                secure=True,
            )

        return response
