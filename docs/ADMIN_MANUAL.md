# Admin Manual — Campus Resource Sharing System

Admin accounts have every capability a regular user has, plus the **Admin Panel** (visible
in the sidebar only to accounts with `role = admin`).

## Getting Admin Access
Admin accounts are not self-service — set `role: admin` directly when creating the account
(e.g. via the seed script, or by editing a user's `role` column directly in the database
for your first admin). There is currently no in-app "promote to admin" button, by design:
granting admin rights is a sensitive action best done outside the web UI for a first admin,
after which that admin could extend the API if a UI-driven promotion flow is wanted.

## Admin Panel Overview

### Overview tab (`/admin`)
Shows platform-wide stats at a glance: total users, total resources, total borrows,
pending requests, and active borrows, plus two charts:
- **Most borrowed categories** — which resource categories see the most borrow activity
- **Top contributors** — which users have listed the most resources

Use this to spot whether the platform's activity is concentrated in a few categories
(a signal to recruit more listings elsewhere) or a few power-users (a signal those users
deserve recognition — see Gamification note below).

### Users tab (`/admin/users`)
Lists every registered user with their role, department, trust score, and current status.

- **Suspend**: immediately blocks that user from logging in (existing sessions/tokens
  still work until they expire, since JWTs are stateless — for immediate lockout in
  time-sensitive cases, also rotate `SECRET_KEY`, which invalidates *all* tokens
  platform-wide, so use that only as a last resort).
- **Unsuspend**: restores login access.

There is no "delete user" action in this build — suspension is the safer default for an
academic platform, since deleting a user would cascade-delete their resource listings
and borrow history, which other users may still need visibility into (e.g. "who did I
lend my camera to last semester").

### Categories tab (`/admin/categories`)
Add or remove resource categories (Electronics, Lab Equipment, Sports Equipment, etc.).
Deleting a category that still has resources assigned to it will fail at the database
level (foreign key constraint) rather than silently orphaning those resources — reassign
or delete the resources first if you need to remove a category.

### Complaints tab (`/admin/complaints`)
Every complaint filed by any user, most recent first. For each:
1. Change its **status** (open → in progress → resolved/closed) as you work it.
2. Write an **admin response** — this is shown back to the user who filed it on their
   own Complaints page, so use it to communicate resolution, not just as an internal note.
3. Click **Save**.

## Operational Notes

- **Seeding demo data**: `docker compose exec backend python scripts/seed_data.py` —
  safe to run once; it no-ops if the admin account already exists.
- **Database migrations**: production deployments should run
  `docker compose exec backend alembic upgrade head` rather than relying on the
  development-only auto-`create_all` behavior (see `MAINTENANCE_GUIDE.md`).
- **Monitoring background jobs**: `docker compose logs -f celery_worker celery_beat`
  shows reminder-job activity; each run logs how many return reminders were sent.
- **Rate limiting**: the login endpoint is capped at 5 attempts/minute per IP. If a
  legitimate user (e.g. behind a shared campus NAT/proxy) reports being locked out,
  this is the likely cause — the limit can be adjusted via `RATE_LIMIT_PER_MINUTE`-style
  settings in `app/core/config.py`.
