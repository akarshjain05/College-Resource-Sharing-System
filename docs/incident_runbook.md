# Incident Response Runbook

This runbook outlines the steps to take during a security or stability incident for the Campus Resource Sharing System (CRSS).

## 1. Roles and Notifications
- **Primary Contact:** System Admin (security@yourdomain.com)
- **Escalation:** University IT / Dean of Student Affairs if data breach impacts student records.
- **Communication:** If the app is down, notify users via the official university Discord/Slack or email list.

## 2. Immediate Triage Actions

### How to Force-Logout All Users
If you suspect an active session hijack or credential stuffing attack:
1. SSH into the production server.
2. Flush the Redis database to immediately invalidate all refresh tokens and sessions:
   ```bash
   docker exec -it crss_redis redis-cli FLUSHALL
   ```
3. Users will be forced to log in again once their short-lived access tokens expire (max 15 mins).

### How to Roll Back a Bad Deploy
If a deployment breaks the site:
1. Revert the bad commit in Git: `git revert <bad_commit_hash>`
2. Push to the `akarsh` branch.
3. The GitHub Action will automatically deploy the reverted code.
4. If the database schema was migrated and caused corruption, restore from backup (see Section 3).

### How to Rotate a Compromised Secret
If `SECRET_KEY`, `POSTGRES_PASSWORD`, or `VITE_GOOGLE_CLIENT_ID` leaks:
1. Update the secret in GitHub Repository Secrets.
2. Update the `.env` file on the production VM.
3. Restart the Docker stack:
   ```bash
   docker compose -f docker-compose.prod.yml down
   docker compose -f docker-compose.prod.yml up -d
   ```
4. If `SECRET_KEY` was rotated, all users will be logged out automatically.

## 3. Backups and Restoration

### Where Backups Live
The `db_backup` container automatically dumps the Postgres database every night. Backups are stored on the host VM in the `/backups` directory (mapped from the container).

### How to Restore a Database Backup
1. Stop the application containers so no new data is written:
   ```bash
   docker stop crss_backend crss_celery_worker crss_celery_beat crss_frontend
   ```
2. Unzip the desired SQL backup file:
   ```bash
   gunzip /path/to/backup/daily/db-YYYYMMDD.sql.gz
   ```
3. Drop and restore the database:
   ```bash
   cat /path/to/backup/daily/db-YYYYMMDD.sql | docker exec -i crss_db psql -U <postgres_user> -d <postgres_db>
   ```
4. Restart the application containers:
   ```bash
   docker start crss_backend crss_celery_worker crss_celery_beat crss_frontend
   ```

## 4. Investigating an Incident
1. **Check Logs:** 
   ```bash
   docker compose -f docker-compose.prod.yml logs --tail 1000 -f
   ```
2. **Look for:** High rates of 401s, 429s, or 500s.
3. **Capture Evidence:** Copy the logs to a file for later review before restarting containers (which might rotate logs).

## 5. Post-Incident
Always complete a Post-Incident Review (PIR) using the `post_incident_review.md` template within 48 hours.
