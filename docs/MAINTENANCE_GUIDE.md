# Maintenance Guide

## Adding a New Backend Feature (typical workflow)
1. **Model**: add/modify a SQLAlchemy class in `app/models/`. Import it in
   `app/models/__init__.py` so Alembic/`create_all` picks it up.
2. **Schema**: add the corresponding Pydantic `*Create`/`*Update`/`*Response` classes in
   `app/schemas/`.
3. **Migration**: `docker compose exec backend alembic revision --autogenerate -m "add X"`,
   review the generated file in `alembic/versions/` (autogenerate is a starting point, not
   gospel — check it against your actual intent, especially for column drops/renames),
   then `docker compose exec backend alembic upgrade head`.
4. **Router**: add endpoints in `app/routers/`, reusing `app/core/deps.py` guards for
   auth/role checks rather than re-implementing them inline.
5. **Wire it up**: `app.include_router(...)` in `app/main.py`.
6. **Test**: add a `tests/test_*.py` case exercising the new endpoint(s) through the
   `TestClient` fixture in `tests/conftest.py`.
7. **Frontend**: add the endpoint wrapper in `frontend/src/api/endpoints.js`, then the
   page/component consuming it.

## Adding a New Frontend Page
1. Create the component under `src/pages/<area>/YourPage.jsx`.
2. Add a `<Route>` for it in `src/App.jsx` (inside the `<AppShell>` route group if it
   needs the logged-in sidebar layout).
3. If it needs sidebar navigation, add an entry to `NAV_ITEMS` in
   `src/layouts/AppShell.jsx` (or `TABS` in `AdminLayout.jsx` for admin sub-pages).

## Database Migrations — Rules of Thumb
- Never edit a migration file that has already been applied to a shared/production
  database — write a new migration instead.
- Run `alembic upgrade head` as part of your deployment process, not `Base.metadata.create_all`
  (that call is gated to `ENVIRONMENT=development` in `main.py` specifically to prevent
  it from silently masking missing migrations in production).
- Before an autogenerate, make sure your local DB is actually at `head` for existing
  migrations, or Alembic will generate a diff against a stale baseline.

## Dependency Updates
- Backend: bump versions in `backend/requirements.txt`, rebuild
  (`docker compose build backend`), and re-run the test suite before merging.
- Frontend: bump versions in `frontend/package.json`, run `npm install` inside the
  container or locally, rebuild, and manually smoke-test the main flows (Tailwind/Vite
  major version bumps in particular can change build output in ways tests won't catch).

## Log Locations
- Application logs: stdout of each container (`docker compose logs -f backend`), using
  the `crss` logger configured in `app/core/logging_config.py`.
- Celery job logs: `docker compose logs -f celery_worker celery_beat`.
- Nginx access/error logs (production): standard `/var/log/nginx/` on the host, or the
  container's stdout/stderr if Nginx itself is containerized.

## Backup & Restore (PostgreSQL)
```bash
# Backup
docker compose exec db pg_dump -U crss_user crss_db > backup_$(date +%F).sql

# Restore
cat backup_2026-07-01.sql | docker compose exec -T db psql -U crss_user crss_db
```
Schedule the backup command via a host cron job for production deployments; the
`docker-compose.yml` in this repo does not include an automated backup service.

## Rotating Secrets
Changing `SECRET_KEY` in `.env` invalidates **every** issued JWT immediately (all users
are logged out on their next request). This is the correct emergency response to a
suspected token leak, but plan for a brief support-ticket spike from confused users
if you do it outside a maintenance window.

## Extending Notification Types
1. Add the new value to `NotificationType` in `app/models/enums.py`.
2. Generate a migration (enum changes need one — Alembic/Postgres enum alterations are a
   known rough edge; test the generated migration carefully, or consider migrating to a
   plain `varchar` + application-level validation if you expect to add types frequently).
3. Call `create_notification(...)` with the new type from wherever the triggering event
   occurs.
4. If it should also send an email, add a template function to
   `app/services/email_service.py` and call it via `BackgroundTasks` or a Celery task.
