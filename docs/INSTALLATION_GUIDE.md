# Installation Guide

This guide gets CRSS running locally for development or evaluation. For production
deployment (VPS/Render/Railway), see `deployment/DEPLOYMENT_GUIDE.md`.

## Prerequisites
- Docker Engine 24+ and Docker Compose v2 (`docker compose version` should work)
- Git
- ~2GB free disk space for images/volumes

You do **not** need Python, Node, or PostgreSQL installed on your host — everything runs
inside containers.

## Step-by-step

1. **Get the code onto your machine**
   Extract the provided project zip (or clone your repo) so you have a `Campus-Resource-Sharing/`
   (or `crss/`) folder containing `backend/`, `frontend/`, `docker-compose.yml`, etc.

2. **Create your environment file**
   ```bash
   cd crss
   cp .env.example .env
   ```
   Open `.env` and, at minimum for local development, you can leave the defaults —
   they're wired to match the service names in `docker-compose.yml`. For anything beyond
   local dev, change `SECRET_KEY` and the Postgres password.

3. **Build and start every service**
   ```bash
   docker compose up --build
   ```
   First run will take a few minutes (downloading base images, installing Python/Node
   dependencies). Subsequent runs are much faster due to Docker layer caching.

4. **Confirm everything is healthy**
   In a new terminal:
   ```bash
   docker compose ps
   ```
   You should see `db`, `redis`, `backend`, `celery_worker`, `celery_beat`, and `frontend`
   all in a running/healthy state.

5. **Open the app**
   - Frontend: http://localhost:5173
   - API docs (Swagger): http://localhost:8000/docs
   - Health check: http://localhost:8000/health

6. **Seed demo data** (categories + an admin account + a couple of sample resources)
   ```bash
   docker compose exec backend python scripts/seed_data.py
   ```
   This prints the demo login credentials to the console when it finishes.

7. **Run the test suite** (optional but recommended before any submission/demo)
   ```bash
   docker compose exec backend pytest -v
   ```

## Stopping / resetting

```bash
docker compose down            # stop containers, keep data
docker compose down -v         # stop containers AND wipe the database volume
```

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `backend` container keeps restarting | Check `docker compose logs backend` — usually a missing/misnamed env var, or the DB isn't ready yet (the `depends_on: condition: service_healthy` should prevent this, but if you changed the compose file, verify the healthcheck is still wired) |
| Frontend loads but API calls fail with CORS errors | Confirm `BACKEND_CORS_ORIGINS` in `.env` includes `http://localhost:5173` |
| `alembic` commands fail with "target database is not up to date" | Run `docker compose exec backend alembic upgrade head` before generating new revisions |
| Uploaded images 404 | Confirm the `crss_uploads` volume is mounted on both `backend` (read/write) — check `docker compose config` output for the resolved volume mapping |
| Port 5173/8000/5432/6379 already in use | Another process on your machine is using that port; change the left-hand side of the `ports:` mapping in `docker-compose.yml` (e.g. `"5433:5432"`) |
