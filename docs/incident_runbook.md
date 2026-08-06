# Campus Resource Sharing System (CRSS) - Incident Runbook

This document outlines the standard operating procedures for resolving single points of failure (SPOF) and external dependency outages. At our current scale, our strategy is **Fast Recovery**, not zero-downtime high-availability (HA).

## 1. Single VM Failure (Whole App Down)
If the host server running the `docker-compose.prod.yml` stack dies or becomes unrecoverable:

**Mitigation & Recovery:**
1. **Provision a new VM**: Spin up a new Ubuntu server on your cloud provider.
2. **Install Dependencies**: Run the setup script to install Docker and Docker Compose.
3. **Pull Secrets**: Securely retrieve your `.env` file from your encrypted password manager. 
4. **Clone Repository**: `git clone https://github.com/akarshjain05/College-Resource-Sharing-System.git`
5. **Restore Database**: Fetch the latest automated Postgres snapshot from AWS S3 (or your offsite backup storage) and place it in the VM.
6. **Deploy**: Run `docker-compose -f docker-compose.prod.yml up -d --build`.
7. **DNS Update**: Point your domain's A-record to the new VM's IP address. 
*Expected Recovery Time: 15-30 minutes.*

## 2. Postgres Database Failure (Disk Corruption / Crash)
If the Postgres container crashes or the volume corrupts:

**Mitigation & Recovery:**
1. We rely on automated daily/hourly backups. (Ensure `pg_dump` cron jobs are running and syncing offsite).
2. Stop the broken database container: `docker-compose stop db`
3. Wipe the corrupted volume (if necessary) and restart the container: `docker-compose up -d db`
4. Restore the latest backup dump:
   ```bash
   cat latest_backup.sql | docker exec -i crss_db psql -U $POSTGRES_USER -d $POSTGRES_DB
   ```
5. Restart the backend API to clear connection pools.
*Expected Recovery Time: 5-10 minutes.*

## 3. Redis Failure (Rate Limiting & Caching)
If the Redis container crashes or memory runs out:

**Mitigation & Recovery:**
- **Status**: The application is designed to **fail open (gracefully degrade)**.
- If Redis is unreachable, the API will automatically switch to in-memory rate limiting and in-memory OTP/presence tracking.
- The system will NOT crash. However, rate limits will be tracked per-process rather than globally.
- **Action**: Restart Redis `docker-compose restart redis` at your earliest convenience to restore global limits.

## 4. Compromised SECRET_KEY
If the primary JWT signing secret is leaked:

**Mitigation & Recovery:**
1. Generate a new secure secret string.
2. Update the `.env` file on the server:
   - Move the compromised key to `OLD_SECRET_KEY=...`
   - Put the new key in `SECRET_KEY=...`
3. Restart the backend API.
4. **Result**: All existing user sessions will remain valid (verified via `OLD_SECRET_KEY`), but all *new* sessions will be signed with the new key.
5. Once all old sessions expire natively (e.g., after 7 days), you can remove `OLD_SECRET_KEY` entirely.

## 5. Third-Party Dependency Outages

### Brevo (Email Provider)
- **Impact**: New users cannot verify their accounts; existing users cannot reset passwords.
- **Runbook**: Check [Brevo Status Page](https://status.brevo.com/). If they are down, post an announcement on the campus portal/socials noting that signups are temporarily delayed. Do NOT attempt to build a fallback SMTP server mid-incident. Wait for Brevo recovery.

### Razorpay (Payment Gateway)
- **Impact**: Users cannot pay security deposits; transactions will fail.
- **Runbook**: Check [Razorpay Status Page](https://status.razorpay.com/). If down, the frontend will elegantly fail to open the checkout modal. Advise users to complete transactions manually (cash) temporarily or wait for resolution. 

### Google OAuth
- **Impact**: Users cannot log in via "Continue with Google".
- **Runbook**: Check [Google Cloud Status](https://status.cloud.google.com/). Users can still use the traditional Email/Password login if they have one configured. 

---
**Bus Factor Note**: Ensure that at least one other trusted administrator has access to the cloud provider dashboard, the domain registrar, and the encrypted vault containing the `.env` secrets.
