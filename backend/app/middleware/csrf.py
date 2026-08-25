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
    # Genuinely unauthenticated/public POST endpoints that don't use cookies.
    # /auth/refresh and /auth/logout are NOT here — they rely on the
    # httpOnly refresh-token cookie and MUST be CSRF-protected.
    CSRF_EXEMPT_PATHS = {
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/api/v1/auth/verify-signup-otp",
        "/api/v1/auth/resend-signup-otp",
        "/api/v1/auth/google",
        "/api/v1/auth/google/complete-profile",
        "/api/v1/auth/forgot-password",
        "/api/v1/auth/reset-password",
    }

    async def dispatch(self, request: Request, call_next):
        existing_token = request.cookies.get(CSRF_COOKIE_NAME)

        # Bearer-token requests (the normal API path) are not vulnerable to CSRF
        # since browsers never attach Authorization headers automatically.
        is_bearer_request = request.headers.get("authorization", "").lower().startswith("bearer ")
        is_exempt = is_bearer_request or request.url.path in self.CSRF_EXEMPT_PATHS

        # A request with no CSRF cookie at all was never issued a token to echo back —
        # it's a plain unauthenticated/non-browser request, not a cookie-riding CSRF
        # attempt. Let it fall through to the route's own auth dependency, which will
        # correctly reply 401. Only enforce once a session (and its csrf_token cookie)
        # actually exists.
        has_csrf_cookie = existing_token is not None

        if (
            request.method not in SAFE_METHODS
            and not is_exempt
            and has_csrf_cookie
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
