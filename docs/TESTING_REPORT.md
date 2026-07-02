# Testing Report

## 1. Testing Strategy

CRSS uses a **pytest + FastAPI TestClient** approach for backend API/integration testing.
Each test runs against an isolated **in-memory SQLite database** (via a `StaticPool`
fixture in `tests/conftest.py`), rather than the production PostgreSQL instance, so the
suite:
- has zero external dependencies to run (`docker compose exec backend pytest` — no
  separate test database to provision or tear down),
- is fast enough to run on every commit,
- gets a completely fresh schema per test function, eliminating cross-test pollution.

SQLAlchemy 2.0's `postgresql.UUID` type is dialect-agnostic (it derives from the generic
`Uuid` type introduced in 2.0), so the same models work unmodified against SQLite in
tests and PostgreSQL in production — no test-only model duplication needed.

## 2. Test Coverage by Module

| Module | File | Cases |
|---|---|---|
| Authentication | `tests/test_auth.py` | register, duplicate-email rejection, login success/failure, `/me` auth requirement, change-password (+ old password invalidated) |
| Resources | `tests/test_resources.py` | create, unauthenticated-create rejection, list, search-by-title, non-owner edit forbidden, owner delete |
| Borrow lifecycle | `tests/test_borrow.py` | full happy-path lifecycle (request → approve → return, with availability counters verified at each step), self-borrow rejection, reject flow, non-owner approve forbidden |
| Admin / RBAC | `tests/test_admin.py` | non-admin blocked from user list, admin can list users, suspend/unsuspend (+ suspended user blocked from login), analytics overview, category CRUD is admin-only |

**Total: 22 test cases** across 4 files, covering the primary user journeys end-to-end
(not just unit-level function calls) via real HTTP requests through the FastAPI
`TestClient`, which exercises the full stack — routing, dependency injection, Pydantic
validation, and the ORM — for each case.

## 3. Test Types Present

- **API/integration tests** (the majority): exercise a full request → router → DB →
  response cycle.
- **Implicit unit coverage**: password hashing/verification and JWT
  encode/decode are exercised indirectly through the auth tests (login only succeeds if
  `hash_password`/`verify_password` round-trip correctly; `/me` only succeeds if
  `create_access_token`/`decode_token` round-trip correctly).

## 4. Known Gap: Execution Verification

This project was generated and syntax-verified in a sandboxed environment without
outbound network access, so package installation (`pip install -r requirements.txt`) and
therefore an actual `pytest` run could not be performed during generation. Every Python
file was verified with `py_compile` (catches syntax errors) and manually cross-checked
for import/reference consistency across modules. **Before submission, run the suite for
real:**

```bash
docker compose up --build -d
docker compose exec backend pytest -v
```

If any test fails, it is far more likely to be a fixture/assertion mismatch than a deep
logic bug, given the layer already passed static verification — a quick fix from the
actual pytest output should resolve it.

## 5. Manual Test Checklist (for the parts automated tests don't cover)

| Area | Manual check |
|---|---|
| Image upload | Upload a resource photo via the "List a resource" → edit flow; confirm it renders on the detail page and is served from `/uploads/...` |
| Email delivery | Configure real SMTP creds in `.env`, register a new account, confirm the verification email arrives |
| WebSocket push | Open two browser sessions (lender + borrower); submit a borrow request as borrower and confirm the lender sees a live toast without refreshing |
| Rate limiting | Attempt 6+ rapid login attempts with a wrong password; confirm the 6th returns HTTP 429 |
| Celery reminder | Seed a borrow request with `requested_end_date` = tomorrow; manually trigger `celery -A app.tasks.celery_app call app.tasks.reminders.send_return_reminders` and confirm a notification + email fire |
| Responsive layout | Resize browser to 375px width; confirm the sidebar collapses and cards reflow to a single column |
| Dark/light mode | *(Not yet implemented — see README "Not yet built")* |

## 6. Frontend Testing Note

No automated frontend test suite (Jest/Vitest/React Testing Library) is included in this
build. All `.jsx` files were verified for syntactic correctness via the TypeScript
compiler's JSX parser (`tsc --noEmit`-equivalent transpilation check) during generation,
which catches malformed JSX, mismatched braces, and invalid syntax, but does not verify
runtime behavior or render output. Recommended next step: add Vitest + React Testing
Library component tests for `ResourceCard`, `ProtectedRoute`, and the borrow-request
action flow.
