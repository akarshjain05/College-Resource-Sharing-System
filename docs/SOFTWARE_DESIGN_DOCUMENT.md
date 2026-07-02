# Software Design Document (SDD)
## Campus Resource Sharing System (CRSS)

---

## 1. Design Goals
1. **Separation of concerns** — HTTP handling (routers), validation (schemas), persistence
   (models), and business rules (services) are kept in distinct layers so any one can change
   without rewriting the others.
2. **Statelessness** — the backend holds no session state in memory or in-process beyond the
   WebSocket connection registry (which is explicitly designed to be safely lossy — a dropped
   connection just means the client falls back to polling on next page load).
3. **Fail loud, fail safe** — a centralized exception-handling layer (`app/core/exceptions.py`)
   guarantees every error path returns a consistent, parseable JSON shape instead of leaking
   stack traces or returning inconsistent ad-hoc error bodies.

## 2. High-Level Architecture

```
┌─────────────────┐        HTTPS/WSS        ┌──────────────────────┐
│   React SPA      │◄───────────────────────►│   FastAPI backend     │
│  (Vite, Tailwind) │       REST + WS         │  (Uvicorn, 1+ workers)│
└─────────────────┘                          └──────────┬────────────┘
                                                          │
                                     ┌────────────────────┼─────────────────────┐
                                     ▼                    ▼                     ▼
                              ┌─────────────┐      ┌─────────────┐      ┌──────────────┐
                              │ PostgreSQL   │      │   Redis      │      │ Celery worker │
                              │ (primary DB) │      │ (rate-limit, │      │ + beat        │
                              │              │      │  Celery bus) │      │ (reminders)   │
                              └─────────────┘      └─────────────┘      └──────────────┘
```

## 3. Backend Layering

```
Request → Router → (auth/role Dependency) → Pydantic Schema validation
        → Service / direct ORM query → SQLAlchemy Model → PostgreSQL
        ← Pydantic Response Schema ← Router ← Response
```

- **`app/models/`** — SQLAlchemy ORM classes. One file per bounded concept
  (`user.py`, `resource.py`, `borrow.py`, `misc.py` for smaller supporting entities).
  All models share `UUIDMixin` (UUID primary keys — safer to expose in URLs than
  sequential integers) and `TimestampMixin` (`created_at`/`updated_at`).
- **`app/schemas/`** — Pydantic v2 models. Split into `*Create`, `*Update`, and
  `*Response` variants per entity so the API surface for "what a client may send" and
  "what a client receives back" are independently controlled (e.g. `hashed_password`
  never appears in any response schema).
- **`app/routers/`** — one FastAPI `APIRouter` per resource/domain. Route handlers stay
  thin: validate via dependency injection, call the ORM or a service function, return.
- **`app/services/`** — logic reused across routers (notification creation, email
  templating/sending) so it isn't duplicated inline in multiple route handlers.
- **`app/core/`** — cross-cutting concerns: `config.py` (env-driven settings),
  `database.py` (engine/session), `security.py` (hashing, JWT), `deps.py` (auth/role
  guards), `exceptions.py` (error handling), `rate_limit.py`, `logging_config.py`.

## 4. Key Design Decisions

### 4.1 Why UUID primary keys instead of auto-increment integers?
Resource and user IDs appear directly in URLs (`/resources/{id}`) and are shared with
other users (e.g. via a QR code pointing at a resource). Sequential integers would let
anyone enumerate `/resources/1`, `/resources/2`, ... and estimate total catalog size or
scrape every listing trivially. UUIDs remove that enumeration vector at negligible cost.

### 4.2 Why a synchronous SQLAlchemy session instead of async ORM calls?
FastAPI runs sync path operations in a threadpool automatically, so a synchronous
SQLAlchemy `Session` (rather than the newer async engine + `AsyncSession`) keeps the
codebase simpler for a project of this scope while still not blocking the event loop for
other concurrent requests. The one place true async matters — the WebSocket notification
push — is handled directly with `asyncio.run_coroutine_threadsafe` bridging from the sync
worker thread back onto the main event loop (see `app/services/ws_manager.py`).

### 4.3 Why JWT with separate access/refresh tokens rather than server-side sessions?
Statelessness lets the API scale horizontally without sticky sessions or a shared session
store. Short-lived access tokens (30 min) limit the damage window if a token leaks;
the longer-lived refresh token lets the frontend renew silently without forcing frequent
re-logins.

### 4.4 Why is quantity tracked as `quantity` + `quantity_available` rather than
   generating N individual row instances?
A club's soldering station kit might have `quantity=3` identical units. Tracking a
single `Resource` row with an available-count column avoids the complexity of managing
N nearly-identical child rows, while still correctly gating borrow requests once all
units are checked out (`status` flips to `borrowed` when `quantity_available` hits 0).

### 4.5 Why Celery (not just FastAPI BackgroundTasks) for return reminders?
`BackgroundTasks` runs after a response is sent but still within the same web process,
and only fires in reaction to a request — there's no mechanism for a scheduled, repeating
job with no triggering request. Return reminders need to fire daily regardless of API
traffic, so they're implemented as a Celery Beat-scheduled task running in a separate
worker process, decoupled from the request/response cycle entirely.

## 5. Frontend Design

- **State management**: React Context (`AuthContext`) for the single piece of genuinely
  global state (the logged-in user). Everything else is local `useState`/`useEffect`
  per page — the app is not large enough to justify Redux/Zustand.
- **API layer**: a single Axios instance (`api/client.js`) with request/response
  interceptors handling (a) attaching the JWT, (b) silent token refresh on 401, and
  (c) CSRF header echoing. `api/endpoints.js` wraps every backend route in a typed
  function so pages never construct URLs by hand.
- **Routing**: `react-router-dom` v6, with a `ProtectedRoute` wrapper gating
  authenticated and admin-only routes.
- **Visual system**: a custom Tailwind theme (ink/forest/brass palette, Fraunces +
  Inter typography) and a signature "library index card" component style used for
  resource and borrow-request listings, reflecting the campus-library framing of the
  product rather than a generic SaaS dashboard look.

## 6. Data Flow Example: Approving a Borrow Request

1. Owner clicks "Approve" on `BorrowRequestsPage` → `borrowApi.approve(id)` → `POST
   /api/v1/borrow-requests/{id}/approve` with the JWT in the `Authorization` header.
2. `deps.get_current_user` resolves and validates the JWT, loads the `User` row.
3. `routers/borrow.py::approve_borrow_request` loads the `BorrowRequest`, verifies the
   caller is the lender (or admin) via `_get_owned_request`, checks the state machine
   (`status == REQUESTED`), then mutates `status`, decrements
   `resource.quantity_available`, and flips `resource.status` if it hit zero.
4. `notification_service.create_notification` persists a `Notification` row **and**
   calls `ws_manager.notify_user`, which schedules an async send to the borrower's
   WebSocket if they're connected.
5. Response (the updated `BorrowRequestResponse`) returns to the owner's browser;
   independently, the borrower's browser (if connected) receives a WebSocket push and
   shows a toast + increments their unread badge without any polling.

## 7. Error Handling Strategy

All exceptions funnel through handlers registered in `register_exception_handlers`:

| Exception | HTTP Status | Shape |
|---|---|---|
| `AppException` subclasses (`NotFoundException`, `ForbiddenException`, `ConflictException`, or ad-hoc `AppException`) | Set per-exception (404/403/409/400/...) | `{"detail": str, "error_code": str}` |
| Pydantic `RequestValidationError` | 422 | `{"detail": [...], "error_code": "VALIDATION_ERROR"}` |
| SQLAlchemy `IntegrityError` | 409 | `{"detail": "...duplicate...", "error_code": "DB_INTEGRITY"}` |
| Any other `SQLAlchemyError` | 500 | `{"detail": "Internal database error", "error_code": "DB_ERROR"}` |
| Anything unhandled | 500 | `{"detail": "Internal server error", "error_code": "INTERNAL_ERROR"}` (full traceback logged server-side only) |

This gives the frontend a single, predictable shape to branch on (`error_code`) instead
of parsing human-readable `detail` strings.
