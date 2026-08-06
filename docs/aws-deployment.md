# AWS EC2 Deployment Guide

Deploying the Campus Resource Sharing System (CRSS) to AWS EC2 using Docker Compose.

## 1. Prerequisites
- An AWS EC2 instance (Ubuntu 22.04 LTS or similar).
- **Docker** and **Docker Compose** installed on the instance.
- **Git** installed on the instance.

## 2. AWS Security Group Configuration
Ensure your EC2 instance's Security Group has the following **Inbound Rules** enabled:
- **Port 22 (TCP)**: From your IP (for SSH access)
- **Port 80 (TCP)**: From Anywhere IPv4 (`0.0.0.0/0`) (For the Frontend application)
- **Port 8000 (TCP)**: From Anywhere IPv4 (`0.0.0.0/0`) (For the Backend API)

## 3. Clone and Setup
SSH into your EC2 instance and run:
```bash
git clone <your-repository-url>
cd crss
```

Create a `.env` file based on the example:
```bash
cp .env.example .env
```

Open `.env` and edit the necessary fields (like `SECRET_KEY`, `POSTGRES_PASSWORD`, etc.).

## 4. Set the Public API URL (Crucial!)
Because the frontend compiles into static HTML/JS, it needs to know *at build time* where the backend API lives. You cannot use `localhost` in production unless you only want to access the app from the EC2 instance itself.

Find your EC2 instance's **Public IPv4 address** or **Public IPv4 DNS** in the AWS console.

Export it before running docker-compose so the frontend build process can bake it in:
```bash
# Replace 54.1.2.3 with your actual AWS Public IP or domain
export PUBLIC_API_URL=http://54.1.2.3:8000/api/v1
```

## 5. Build and Run
With `PUBLIC_API_URL` exported, run the production docker-compose file:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

*(Note: We've already updated `docker-compose.prod.yml` to automatically handle CORS by allowing `["*"]` in production, so you won't get any Cross-Origin errors when accessing from your public IP).*

## 6. Access the Application
- **Frontend**: Navigate to `http://<your-aws-public-ip>`
- **Backend API Docs**: Navigate to `http://<your-aws-public-ip>:8000/docs`

## 7. Troubleshooting
- **White Screen / API errors**: If the frontend fails to fetch data, ensure `PUBLIC_API_URL` was correctly exported *before* you ran the `--build` command. If you forgot, run `export PUBLIC_API_URL=...` and then force a rebuild of the frontend: `docker compose -f docker-compose.prod.yml up -d --build frontend`.
- **Can't reach site**: Double check your AWS Security Group inbound rules for ports 80 and 8000.
