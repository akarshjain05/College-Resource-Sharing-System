# Campus Resource Sharing System (CRSS)

A secure, campus-only platform where students, faculty, and clubs can lend and borrow resources — cameras, lab equipment, sports gear, books, and more — instead of buying items that mostly sit idle.

## Tech stack

**Backend:** FastAPI, SQLAlchemy 2.0, PostgreSQL, Alembic, JWT auth, Redis, Pydantic v2
**Frontend:** React 18, Vite, React Router, Tailwind CSS, Axios, Recharts
**Infra:** Docker & Docker Compose

## Project structure

```
Campus-Resource-Sharing/
├── backend/
│   ├── app/
│   │   ├── core/        # config, database, security, deps, exceptions, logging
│   │   ├── models/      # SQLAlchemy models
│   │   ├── schemas/     # Pydantic request/response schemas
│   │   ├── routers/     # API route handlers
│   │   ├── services/    # business-logic helpers (e.g. notifications)
│   │   └── main.py      # FastAPI app entrypoint
│   ├── alembic/         # DB migrations
│   ├── scripts/         # seed_data.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/         # axios client + endpoint wrappers
│   │   ├── components/  # ResourceCard, StatCard, ProtectedRoute
│   │   ├── context/     # AuthContext
│   │   ├── layouts/     # AppShell, AdminLayout
│   │   └── pages/       # auth, resources, borrow, profile, admin
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## Running the project

1. Copy the environment file:
   ```bash
   cp .env.example .env
   ```
2. Build and start everything:
   ```bash
   docker compose up --build
   ```
3. Once containers are healthy:
   - Frontend: http://localhost:5173
   - Backend API docs (Swagger): http://localhost:8000/docs
   - Backend health check: http://localhost:8000/health

4. Seed demo data (categories, an admin account, a couple of resources):
   ```bash
   docker compose exec backend python scripts/seed_data.py
   ```
   Demo logins after seeding:
   - Admin: `admin@crss.edu` / `AdminPass123!`
   - Student: `asha.rao@crss.edu` / `Password123!`

## Database migrations

Tables auto-create on backend startup in development (`ENVIRONMENT=development`). For production-style migrations:

```bash
docker compose exec backend alembic revision --autogenerate -m "initial schema"
docker compose exec backend alembic upgrade head
```

## What's implemented in this build

- JWT auth (register/login/refresh/change-password/forgot-reset password/email verification)
- Role-based access (student, faculty, club, admin)
- Resource CRUD with search, filters, sorting, pagination
- Borrow request lifecycle: request → approve/reject → return, with damage reporting
- Reviews (only after a completed, returned borrow)
- In-app notifications + transactional emails (verification, password reset, borrow request, return reminders)
- Image uploads for profile pictures and resource photos, served via `/uploads`
- Complaints / support ticket system with admin resolution workflow
- Rate limiting on the login endpoint (Redis-backed via slowapi)
- Celery worker + beat schedule for daily automated return reminders
- Admin analytics (overview stats, most-borrowed categories, top contributors, department usage)
- Admin user management (suspend/unsuspend) and category management
- pytest suite covering auth, resources, the full borrow lifecycle, and admin RBAC (SQLite in-memory, no external deps needed to run)
- Production deployment configs: multi-stage Nginx-served frontend build, reverse-proxy Nginx config, and a deployment guide for Ubuntu VPS / Render / Railway
- React/Tailwind frontend for every one of the above flows, with a distinct "library index card" visual identity

### Running the tests

```bash
docker compose exec backend pytest
```
(Tests use an in-memory SQLite DB via fixtures, so they don't touch your real Postgres data.)

- WebSocket real-time notifications (in-app push, with graceful polling fallback)
- CSRF middleware (defense-in-depth double-submit-cookie pattern)
- Complaints/support ticket system with both user and admin UI
- Full documentation set in `docs/` — SRS, design doc, ER diagram, DFDs, UML diagrams,
  API reference, testing report, user/admin manuals, installation & maintenance guides,
  presentation notes, viva Q&A, and a consolidated project report. Start at `docs/README.md`.

## Project status

All planned phases are complete. See `docs/PROJECT_REPORT.md` Chapter 11 for an honest
accounting of what's deliberately out of scope for this iteration (native mobile apps,
real payment processing, dark mode, a frontend automated test suite) versus what's fully
implemented.

**Important caveat on verification:** this project was built and syntax-verified in a
sandboxed environment without outbound network access, so `pip install` / `npm install` /
an actual `docker compose up` / `pytest` run could not be executed during generation.
Every Python file passed `py_compile`, every JS/JSX file passed a TypeScript-based syntax
check, and `docker-compose.yml`/`package.json` were validated as well-formed — but a real
build is the final verification step. Run it, and if anything surfaces, share the error
and it'll get fixed fast; dependency-version mismatches are far more likely than logic
bugs at this point.
