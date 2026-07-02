# Presentation Notes

Suggested flow for a 10–15 minute project demo/viva.

## 1. Problem framing (1–2 min)
Open with the real scenario: a robotics club's soldering station sits unused most of the
semester while another club buys a duplicate; a senior's reference books gather dust after
finals while juniors buy new copies. Name the core idea in one line: **"turn idle campus
property into a shared, trackable resource pool, scoped to people who actually know each
other on the same campus."** Explicitly contrast with OLX/Facebook Marketplace — this is
campus-only, role-aware (student/faculty/club/admin), and has a structured borrow →
approve → return lifecycle instead of an unmoderated chat-and-hope exchange.

## 2. Architecture walkthrough (2–3 min)
Show the deployment diagram (`docs/UML_DIAGRAMS.md` §5). Key points to say out loud:
- React frontend and FastAPI backend are fully decoupled — talk only over REST + WebSocket
- PostgreSQL for durable data, Redis for rate-limiting/Celery, Celery for scheduled jobs
  decoupled from the request/response cycle
- Everything ships as Docker containers — `docker compose up` is the entire "install"

## 3. Live demo script (5–7 min)
1. **Register two accounts** in two browser windows/incognito tabs — one as a student
   lender, one as a student borrower. Point out email/role fields.
2. **As lender**: list a resource (e.g. a DSLR camera) with a photo, category, condition,
   deposit, and pickup location.
3. **As borrower**: search for it on the Browse page, open the detail page, submit a
   borrow request with dates.
4. **Switch to the lender's window** without refreshing — show the notification bell
   updating live (WebSocket push) and approve the request.
5. **Switch back to the borrower** — show the live toast notification arriving, then
   walk through Borrow Requests → mark it returned.
6. **Leave a review** on the resource now that the borrow is complete — point out the
   backend enforces you can only review something you actually borrowed and returned.
7. **Log in as admin** (seeded account) → show the analytics dashboard (charts), suspend
   the demo borrower account to show RBAC enforcement, then log back in as that borrower
   and show login is now blocked.

## 4. Under-the-hood highlights (2–3 min)
Pick 2–3 of these depending on the audience's technical depth:
- **Statelessness**: JWT access/refresh tokens, no server-side session store — horizontally
  scalable by design.
- **Consistent error contract**: every failure path returns `{"detail", "error_code"}`,
  shown via the centralized exception handlers in `app/core/exceptions.py`.
- **The WebSocket bridge**: explain the sync-route-to-async-WebSocket problem
  (`asyncio.run_coroutine_threadsafe`) as a concrete "hard part we solved."
- **Test suite**: mention it runs against in-memory SQLite with zero external
  dependencies, so it can run in CI without provisioning a database.
- **Security layering**: bcrypt hashing, rate-limited login, CSRF defense-in-depth, ORM-only
  DB access (no raw SQL string interpolation → no SQL injection surface).

## 5. Roadmap / what's next (1 min)
Be upfront about what's intentionally out of scope for this build: native mobile apps,
real payment processing for deposits, dark mode, and a frontend automated test suite.
Framing these as deliberate scope decisions (not oversights) reads better than pretending
the project is 100% feature-complete.

## Anticipated tricky questions
See `docs/VIVA_QUESTIONS.md` for a full Q&A bank — skim it once before presenting.
