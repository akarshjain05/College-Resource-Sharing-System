# Notification Microservice Integration Guide

This document details the architectural integration between **Campus Resource Sharing System (CRSS)** and the **Notification Engine Microservice** located at `D:\notification`.

---

## 1. System Architecture & Overview

The Notification Engine is a standalone microservice responsible for multi-channel event notification (In-App WebSockets, Email via Resend/SMTP, and Push Notifications via Firebase Cloud Messaging).

```
+-----------------------------+           HTTP POST /events         +-------------------------------------+
|                             | ----------------------------------> | Notification Microservice (FastAPI) |
| CRSS Backend (FastAPI)      |   (Header: X-API-Key)               | Port: 10000                         |
| Port: 8000                  |                                     +-------------------------------------+
|                             |                                                       |
+-----------------------------+                                                       v
                                                                            Kafka (notification.events)
                                                                                      |
                                                                                      v
                                                                             Orchestrator Service
                                                                                      |
                                                                       +--------------+--------------+
                                                                       |              |              |
                                                                       v              v              v
                                                                  In-App Queue   Email Queue     Push Queue
                                                                       |              |              |
                                                                       v              v              v
                                                                 In-App Worker   Email Worker   Push Worker
                                                                       |              |              |
                                                                  Redis PubSub     Resend/SMTP     Firebase
                                                                       |
                                                                       v
+-----------------------------+                               WebSocket Push
| CRSS Frontend (Vite/React)  | <-----------------------------------------------------+
| Port: 5173                  | (ws://localhost:10000/ws/{user_id})
+-----------------------------+
```

---

## 2. Configuration & Environment Variables

### Backend Configuration (`backend/app/core/config.py` & `.env`)

```env
NOTIFICATION_SERVICE_URL=http://localhost:10000
NOTIFICATION_SERVICE_API_KEY=default-dev-key
```

- When running CRSS locally outside Docker, use `http://localhost:10000`.
- When running both services inside Docker containers, set `NOTIFICATION_SERVICE_URL=http://notification_microservice:10000`.

### Frontend Configuration (`frontend/.env` / `docker-compose.yml`)

```env
VITE_NOTIFICATION_API_URL=http://localhost:10000
```

---

## 3. How Notification Events are Triggered

### A. In-App & Push Notifications (`app.services.notification_service`)

Whenever `create_notification(...)` is invoked (for borrow requests, approvals, returns, wanted items, or complaints), it performs:
1. Local Database Persistence (`Notification` model in PostgreSQL).
2. Local WebSocket broadcast (`ws_manager`).
3. Microservice Ingestion via `forward_to_microservice(...)`.

#### Example Payload Sent to `POST /events`:
```json
{
  "user_id": "8f3b2c1a-9b4e-4e3f-8a1c-2b3c4d5e6f7a",
  "event_type": "borrow.requested",
  "channels": ["inapp", "push", "email"],
  "force_delivery": true,
  "contact_info": {
    "email": "user@crss.edu"
  },
  "payload": {
    "title": "New Borrow Request",
    "message": "Asha Rao requested to borrow your DSLR Camera.",
    "link": "/borrow-requests"
  }
}
```

### B. Transactional Email Delegation (`app.services.email_service`)

Verification emails, password reset requests, and borrow reminders trigger high-priority events:
- `event_type`: `"auth.verification"`, `"auth.reset_password"`, `"borrow.reminder"`
- `channels`: `["email"]`
- `force_delivery`: `true`

---

## 4. Frontend Integration (`useNotificationSocket.jsx`)

The React frontend hooks into the notification microservice using `useNotificationSocket`:

```jsx
import { useNotificationSocket } from "../hooks/useNotificationSocket";

function AppShell() {
  const { user } = useAuth();
  
  // Listens to ws://localhost:10000/ws/{user.id}
  useNotificationSocket((payload) => {
    // Increment unread count & show toast alert
  }, user);
}
```

---

## 5. Running the Notification Microservice (`D:\notification`)

1. **Start Microservice Infrastructure** (Kafka, Redis, Postgres):
   ```bash
   cd D:\notification
   docker compose up -d
   ```

2. **Start Microservice FastAPI Backend**:
   ```bash
   cd D:\notification
   uvicorn app.main:app --host 0.0.0.0 --port 10000 --reload
   ```

3. **Start Background Orchestrator & Workers**:
   ```bash
   cd D:\notification
   python -m app.orchestrator
   python -m app.workers.inapp_worker
   python -m app.workers.email_worker
   ```

---

## 6. Verification & Health Check

You can verify that the notification microservice is healthy by visiting:
- Health Check: `http://localhost:10000/health`
- Swagger API Docs: `http://localhost:10000/docs`
