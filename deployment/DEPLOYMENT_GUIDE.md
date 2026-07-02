# Deployment Guide

Three deployment paths are documented below: a self-managed Ubuntu VPS (full control, cheapest for a college
project), Render (simplest managed option), and Railway (good free-tier option for demos).

---

## 1. Ubuntu VPS (recommended for a full production-style deployment)

**Prerequisites:** Ubuntu 22.04+ server, a domain pointed at the server's IP, SSH access.

1. **Install Docker and Docker Compose**
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose-plugin
   sudo systemctl enable docker
   sudo usermod -aG docker $USER
   ```

2. **Clone the project and configure environment**
   ```bash
   git clone <your-repo-url> crss && cd crss
   cp .env.example .env
   nano .env   # set SECRET_KEY, POSTGRES_PASSWORD, SMTP credentials, etc.
   ```
   Generate a strong secret key:
   ```bash
   python3 -c "import secrets; print(secrets.token_urlsafe(64))"
   ```

3. **Switch the frontend to the production Dockerfile** in `docker-compose.yml`:
   ```yaml
   frontend:
     build:
       context: ./frontend
       dockerfile: Dockerfile.prod   # <-- production build served by Nginx
     ports:
       - "80:80"
   ```
   Remove the `volumes:` bind-mounts for `frontend` in production (they're for hot-reload in dev only).

4. **Start the stack**
   ```bash
   docker compose up -d --build
   ```

5. **Run migrations and seed data**
   ```bash
   docker compose exec backend alembic upgrade head
   docker compose exec backend python scripts/seed_data.py
   ```

6. **(Optional) Put the whole stack behind a single Nginx + HTTPS**
   Install Nginx and Certbot on the host, use `deployment/nginx.conf` as a starting point (update
   `server_name` to your domain), then:
   ```bash
   sudo apt install -y nginx certbot python3-certbot-nginx
   sudo cp deployment/nginx.conf /etc/nginx/sites-available/crss
   sudo ln -s /etc/nginx/sites-available/crss /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d your-campus-domain.edu
   ```

7. **Verify**
   - `https://your-campus-domain.edu` → frontend
   - `https://your-campus-domain.edu/docs` → Swagger UI
   - `https://your-campus-domain.edu/api/v1/health` → `{"status": "ok"}`

---

## 2. Render

Render can host the backend as a **Web Service**, Postgres/Redis as **managed add-ons**, and the frontend
as a **Static Site**.

1. Push the repo to GitHub.
2. **Postgres:** Render Dashboard → New → PostgreSQL. Copy the internal connection string.
3. **Redis:** New → Redis (or use Render's key-value store). Copy the connection string.
4. **Backend Web Service:** New → Web Service → connect the repo, root directory `backend/`.
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Environment variables: `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `ENVIRONMENT=production`, plus SMTP vars.
5. **Frontend Static Site:** New → Static Site → root directory `frontend/`.
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
   - Environment variable: `VITE_API_BASE_URL=https://<your-backend>.onrender.com/api/v1`
6. **Celery worker (optional):** New → Background Worker, same repo/root as backend.
   - Start command: `celery -A app.tasks.celery_app worker --loglevel=info`

---

## 3. Railway

1. Push the repo to GitHub, then in Railway: New Project → Deploy from GitHub repo.
2. Add **Postgres** and **Redis** plugins from Railway's marketplace — they auto-inject
   `DATABASE_URL` / `REDIS_URL`-style variables (map them to the names in `.env.example`).
3. Add a service for `backend/` with:
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add a service for `frontend/` with:
   - Build command: `npm install && npm run build`
   - Start command: `npm run preview -- --port $PORT`
   - Or better: use a static file server / Railway's static-site support for the `dist/` folder.
5. Set `VITE_API_BASE_URL` on the frontend service to the backend service's public Railway URL + `/api/v1`.
6. Optionally add a worker service running `celery -A app.tasks.celery_app worker --loglevel=info`.

---

## Post-deployment checklist

- [ ] `SECRET_KEY` changed from the default in `.env.example`
- [ ] `DEBUG=false` and `ENVIRONMENT=production`
- [ ] Alembic migrations applied (`alembic upgrade head`) instead of relying on `create_all`
- [ ] CORS origins restricted to your real frontend domain
- [ ] SMTP credentials set (or email features will silently no-op)
- [ ] Database backups scheduled (VPS: `pg_dump` via cron; Render/Railway: use their managed backup feature)
- [ ] HTTPS enabled (Certbot on VPS; automatic on Render/Railway)
