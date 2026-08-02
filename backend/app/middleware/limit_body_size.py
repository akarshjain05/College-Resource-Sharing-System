from fastapi import Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class ContentSizeLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware to limit the maximum size of incoming request bodies.
    Prevents memory exhaustion DoS attacks from excessively large JSON payloads.
    """
    def __init__(self, app, max_content_size: int = 5 * 1024 * 1024):
        super().__init__(app)
        self.max_content_size = max_content_size

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > self.max_content_size:
                    return JSONResponse(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content={"detail": f"Request body exceeds the {self.max_content_size // (1024 * 1024)}MB limit."}
                    )
            except ValueError:
                pass
        return await call_next(request)
