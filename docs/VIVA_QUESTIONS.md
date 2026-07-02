# Viva Questions & Answers

## Architecture & Design

**Q: Why FastAPI over Django or Flask?**
A: FastAPI gives automatic request/response validation via Pydantic, auto-generated
OpenAPI/Swagger docs with zero extra code, and native async support — useful for the
WebSocket notification feature. Django's batteries-included ORM/admin weren't needed
here since the project already specifies SQLAlchemy, and Flask would require manually
wiring what FastAPI provides out of the box (validation, docs, dependency injection).

**Q: Why is the backend synchronous (regular `def` routes) rather than fully `async def`
with an async SQLAlchemy engine?**
A: FastAPI runs sync routes in a threadpool automatically, so they don't block the event
loop for other requests. For a project at this scale, a sync `Session` is simpler to
reason about than juggling `AsyncSession` + `await` everywhere, and the one place true
async concurrency matters — pushing WebSocket notifications — is handled explicitly via
`asyncio.run_coroutine_threadsafe` bridging from the sync worker thread onto the main
event loop.

**Q: Why UUIDs instead of auto-increment integer IDs?**
A: Two reasons: (1) they don't leak information about total row counts or let someone
enumerate every resource/user by incrementing a URL, and (2) they can be generated
client-side or in any service without coordinating with the database for the next value,
which matters less here but is good practice generally.

**Q: How does the system prevent a student from approving their own borrow request or
borrowing their own resource?**
A: Two checks: `create_borrow_request` explicitly rejects if
`resource.owner_id == current_user.id` (can't borrow your own item), and
`_get_owned_request` in the borrow router verifies `br.lender_id == current_user.id`
(or admin) before allowing approve/reject — so even if someone crafted a request for
someone else's resource, they can't approve it themselves.

## Database

**Q: Why is `average_rating` stored on the `resources` table instead of always computing
it live from the `reviews` table?**
A: It's a deliberate denormalization for read performance — the resource list/search
endpoint is hit far more often than reviews are written, so paying a small write-time
cost (recompute on each new review) avoids an `AVG()` aggregate join on every single
list/search request.

**Q: Why does `borrow_requests` store `lender_id` when it could be derived by joining
through `resource.owner_id`?**
A: Historical accuracy. If resource ownership were ever transferred (not currently
implemented, but a reasonable future feature), old borrow records should still show who
actually handled that specific transaction at the time, not whoever owns the resource
now.

**Q: How are foreign key relationships enforced?**
A: At the database level via SQLAlchemy's `ForeignKey` constraints, translated into real
Postgres `FOREIGN KEY` constraints on migration. Cascade behavior (e.g. deleting a
resource also deletes its images and borrow requests) is defined via
`cascade="all, delete-orphan"` on the relevant relationships.

## Security

**Q: How are passwords protected?**
A: Hashed with bcrypt via `passlib`'s `CryptContext` before storage — the plaintext
password is never persisted, logged, or returned by any API response (the response
schemas simply don't include a password field, so there's no accidental-leak vector at
the serialization layer either).

**Q: What stops someone from bypassing the frontend's role-based UI to hit an admin
endpoint directly?**
A: Nothing stops them from *trying*, but every admin-only route depends on
`require_admin` / `require_roles(...)` — a FastAPI dependency that checks the
authenticated user's role loaded fresh from the database on every request. The frontend
hiding the Admin Panel link is a UX convenience, not the actual security boundary; the
backend dependency is.

**Q: Is this vulnerable to SQL injection?**
A: All database access goes through the SQLAlchemy ORM with parameterized queries —
there is no raw string-interpolated SQL anywhere in the codebase, which is the standard
mitigation.

**Q: Why rate-limit only the login endpoint and not everything?**
A: Login is the highest-value target for brute-force/credential-stuffing attacks since
it's the entry point to an account. Blanket rate limiting on every endpoint is also
supported via slowapi's `default_limits`, but a tighter, endpoint-specific limit on login
(5/min) versus the general default (60/min) reflects that login attempts are inherently
more suspicious at high frequency than, say, browsing resources.

**Q: Does CSRF protection make sense for a JWT Bearer-token API?**
A: Not really needed for the core API, since browsers don't auto-attach `Authorization`
headers the way they do cookies — that's exactly the CSRF attack vector. The CSRF
middleware here is explicitly framed as defense-in-depth for any *future* cookie-based
flow (e.g. a server-rendered admin console) and is a no-op for the JWT-bearer requests
the actual frontend makes.

## Features / Business Logic

**Q: What happens if two people try to borrow the last unit of a resource at the same
time?**
A: Both requests can be created (status `requested`), since creating a request doesn't
reserve inventory — only *approval* does. When the lender approves the first request,
`quantity_available` decrements. If they then try to approve the second request too, the
current implementation doesn't explicitly re-check `quantity_available` at approval
time — this is a known edge case; a production hardening pass would add that check (and
ideally a DB-level row lock) to `approve_borrow_request` to reject the second approval if
availability has since hit zero.

**Q: Why can't a user review a resource they haven't borrowed?**
A: `create_review` explicitly queries for a `BorrowRequest` with
`status == RETURNED` belonging to that reviewer for that resource before allowing the
review — this prevents fake/manipulated ratings from users who never actually used the
item.

**Q: How do return reminders get sent without a user's request triggering them?**
A: A Celery Beat schedule fires `send_return_reminders` daily at a fixed time
(configured in `app/tasks/celery_app.py`), running in a separate worker process
entirely decoupled from the web server — it queries for approved borrows due tomorrow and
fires both an in-app notification and an email for each.

## Testing

**Q: Why SQLite for tests instead of a real PostgreSQL test database?**
A: Speed and zero external setup — the whole suite runs in-process with no database
server to provision, which matters for a project meant to be easy to check out and run.
SQLAlchemy 2.0's `postgresql.UUID` type is dialect-agnostic (built on the generic `Uuid`
type), so the same models work against both backends without any test-only duplication.
The trade-off is that Postgres-specific behavior (like certain constraint edge cases)
isn't exercised by this suite — acceptable for a project at this scope, but worth naming
as a known limitation.

**Q: What's not covered by the automated tests?**
A: Frontend component behavior (no Jest/Vitest suite), email delivery (mocked out
implicitly since SMTP isn't configured in the test environment), WebSocket push delivery,
and Celery task execution — these are called out explicitly in
`docs/TESTING_REPORT.md` §5 as a manual test checklist instead.
