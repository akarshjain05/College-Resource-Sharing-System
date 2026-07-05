# Deploying CRSS on Oracle Cloud — Always Free Tier

This gets the **entire stack** — Postgres, Redis, backend, both Celery services, and the
frontend — running on a single Oracle Cloud VM at **$0/month, permanently** (not a
time-limited trial). Unlike Render's free tier, Oracle's Always Free VM has no
restriction on background worker processes, so Celery works exactly as it does in your
local `docker compose up`.

---

## 1. Create your Oracle Cloud account

1. Go to https://www.oracle.com/cloud/free/ and sign up. You'll need a credit card for
   identity verification, but Always Free resources are never billed — Oracle explicitly
   does not auto-upgrade you.
2. Pick a **Home Region** carefully during signup — Always Free resource availability is
   per-region and **cannot be changed later** without opening a new account. Choose one
   close to your campus for lower latency.

## 2. Create the VM instance

1. Console → **Compute → Instances → Create Instance**.
2. **Name:** `crss-vm` (or anything).
3. **Image and shape:**
   - Click **Edit** next to "Image and shape."
   - Image: **Canonical Ubuntu 22.04**.
   - Shape: click **Change shape** → **Ampere** (ARM-based) → **VM.Standard.A1.Flex**.
     This is the shape with the generous Always Free allowance: up to **4 OCPUs and
     24GB RAM total**, free forever. Set this instance to **2 OCPU / 12GB RAM** — that's
     comfortably enough for Postgres + Redis + backend + 2 Celery processes + frontend,
     and leaves headroom on your Always Free quota if you ever want a second small VM.
   - *(The x86 "VM.Standard.E2.1.Micro" Always Free shape also exists, but only has 1GB
     RAM — too tight for this full stack. Use the ARM Ampere shape.)*
4. **Networking:** leave the default VCN/subnet, and make sure **"Assign a public IPv4
   address"** is checked.
5. **Add SSH keys:** select "Generate a key pair for me" and **download both the private
   and public key** — you cannot retrieve the private key again after this step. Move the
   downloaded private key somewhere safe, e.g.:
   ```bash
   mkdir -p ~/.ssh
   mv ~/Downloads/ssh-key-*.key ~/.ssh/oracle_crss.key
   chmod 600 ~/.ssh/oracle_crss.key
   ```
6. Click **Create**. Wait for the instance state to show **Running**, then copy its
   **Public IP address** from the instance details page.

## 3. Open the required ports (the Oracle-specific gotcha)

Oracle Cloud blocks traffic at **two independent layers**, and people commonly fix only
one and can't figure out why the site still isn't reachable:

**Layer 1 — the cloud console's Security List** (like an AWS security group):
1. Instance details page → click your **VCN** → **Security Lists** → **Default Security
   List**.
2. **Add Ingress Rules** for each of the following (Source CIDR: `0.0.0.0/0` for all of
   these — this is a public web app):
   - Port `80` (HTTP)
   - Port `443` (HTTPS — only needed if you set up a domain + Certbot later)
   - Port `8000` (backend API, since the frontend build talks to it directly by IP in
     the no-domain setup below)

**Layer 2 — the VM's own OS firewall (iptables).** Oracle's Ubuntu images ship with
iptables rules that only allow SSH by default, **even after** you open ports in the
Security List above. SSH in and run:
```bash
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 8000 -j ACCEPT
sudo netfilter-persistent save
```
(If `netfilter-persistent` isn't found: `sudo apt install -y iptables-persistent` first,
then re-run the save command — it'll prompt to save current rules, say yes.)

Skipping either layer is the single most common reason "everything looks right but I
can't load the site."

## 4. Connect and install Docker

```bash
ssh -i ~/.ssh/oracle_crss.key ubuntu@<YOUR_VM_PUBLIC_IP>
```

Once connected:
```bash
sudo apt update && sudo apt upgrade -y

# Install Docker Engine + Compose plugin
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Log out and back in for the group change to take effect
exit
```
Then SSH back in (same command as above).

**About ARM architecture:** every base image this project uses (`python:3.12-slim`,
`node:20-alpine`, `postgres:16-alpine`, `redis:7-alpine`, `nginx:1.27-alpine`) publishes
multi-architecture manifests, so Docker automatically pulls the ARM64 build on this VM
with zero Dockerfile changes needed.

## 5. Add swap space (recommended safety net)

Even with 12GB RAM this is good practice for a VM running a database plus 5 containers:
```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 6. Get the code onto the VM

```bash
sudo apt install -y git
git clone https://github.com/<your-username>/College-Resource-Sharing-System.git crss
cd crss
```

## 7. Configure environment variables

```bash
cp .env.example .env
nano .env
```
Set at minimum:
- `SECRET_KEY` — generate one:
  ```bash
  python3 -c "import secrets; print(secrets.token_urlsafe(64))"
  ```
- `POSTGRES_PASSWORD` — change from the placeholder default
- `PUBLIC_API_URL` — set to `http://<YOUR_VM_PUBLIC_IP>:8000/api/v1`
- `BACKEND_CORS_ORIGINS` — set to `["http://<YOUR_VM_PUBLIC_IP>"]`
- SMTP variables — optional; leave blank and email features simply no-op

## 8. Build and start everything

```bash
docker compose -f docker-compose.prod.yml up -d --build
```
First build takes several minutes (compiling on ARM). Watch progress:
```bash
docker compose -f docker-compose.prod.yml logs -f
```

Check everything is healthy:
```bash
docker compose -f docker-compose.prod.yml ps
```

## 9. Run migrations and seed data

```bash
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
docker compose -f docker-compose.prod.yml exec backend python scripts/seed_data.py
```

## 10. Visit your site

- Frontend: `http://<YOUR_VM_PUBLIC_IP>`
- API docs: `http://<YOUR_VM_PUBLIC_IP>:8000/docs`
- Health check: `http://<YOUR_VM_PUBLIC_IP>:8000/health`

## 11. Make it survive reboots

Oracle occasionally reboots hosts for maintenance. Install the provided systemd unit so
your stack comes back up automatically:
```bash
sudo cp deployment/crss.service /etc/systemd/system/crss.service
sudo nano /etc/systemd/system/crss.service   # confirm WorkingDirectory matches your path, e.g. /home/ubuntu/crss
sudo systemctl daemon-reload
sudo systemctl enable crss.service
```
Test it:
```bash
sudo reboot
# wait ~1 minute, then reconnect and check:
docker compose -f docker-compose.prod.yml ps
```

## 12. (Optional) Add a real domain + HTTPS

**Important — avoid a port conflict first:** right now the `frontend` container binds
host port 80 directly. A host-level Nginx also needs port 80/443 for itself, so before
installing it, change the frontend's port mapping in `docker-compose.prod.yml` from
`"80:80"` to `"127.0.0.1:8080:80"` — this keeps the frontend container reachable only via
localhost, which is exactly what the Nginx config below expects:
```bash
nano docker-compose.prod.yml   # under the `frontend` service, change the ports: line
docker compose -f docker-compose.prod.yml up -d
```

If you own a domain, point an A record at your VM's public IP, then:
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp deployment/nginx.conf /etc/nginx/sites-available/crss
sudo nano /etc/nginx/sites-available/crss   # set server_name to your real domain
sudo rm -f /etc/nginx/sites-enabled/default  # avoid the default site competing for :80
sudo ln -s /etc/nginx/sites-available/crss /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com
```
Then update `.env`: set `PUBLIC_API_URL=https://yourdomain.com/api/v1` and
`BACKEND_CORS_ORIGINS=["https://yourdomain.com"]`, and rebuild just the frontend (since
`VITE_API_BASE_URL` is baked in at build time):
```bash
docker compose -f docker-compose.prod.yml up -d --build frontend
```
Note: with this Nginx layer in front, port 8000 no longer needs to be open to the public
internet — you can remove that ingress rule from both firewall layers in step 3 and route
`/api/` through Nginx to `127.0.0.1:8000` instead (the provided `deployment/nginx.conf`
already does this).

## Updating the app later

```bash
cd crss
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## Redeploying after changing `.env`

Backend/Celery containers read `.env` at container start, so:
```bash
docker compose -f docker-compose.prod.yml up -d
```
is enough (no `--build` needed) **unless** you changed `PUBLIC_API_URL`, which is baked
into the frontend at build time and needs `--build frontend` specifically to take effect.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Site unreachable from browser, but `curl localhost` works on the VM itself | You missed one of the two firewall layers in step 3 — check both the Security List and `iptables` |
| `docker compose` command not found | You're likely using the old standalone `docker-compose` (with a hyphen); this guide uses the newer `docker compose` (space) Compose V2 plugin, installed automatically by `get-docker.sh` |
| Backend container restarting in a loop | `docker compose -f docker-compose.prod.yml logs backend` — almost always a missing/wrong env var, or the DB not being ready (should be handled by the healthcheck `depends_on`, but check anyway) |
| Frontend loads but every API call fails | Check `PUBLIC_API_URL` was correct **at the time you last built** the frontend image, and that `BACKEND_CORS_ORIGINS` matches the URL you're actually visiting the site from |
| Out of memory / containers getting killed | Confirm the swap file from step 5 is active: `free -h` should show a swap row with size > 0 |
| `alembic upgrade head` fails with "target database is not up to date" | Rare on a fresh install; if you're re-running this after schema changes, make sure you're not also relying on the dev-only `Base.metadata.create_all` — that's gated to `ENVIRONMENT=development` in `main.py` and correctly does nothing here since `docker-compose.prod.yml` sets `ENVIRONMENT=production` |
