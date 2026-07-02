# Software Requirements Specification (SRS)
## Campus Resource Sharing System (CRSS)

**Version:** 1.0 &nbsp;|&nbsp; **Status:** Baseline for academic submission

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements of the Campus Resource
Sharing System (CRSS), a web platform that lets students, faculty, and clubs within a single
college lend and borrow physical resources — cameras, lab equipment, sports gear, books,
calculators, and similar items — that would otherwise sit idle.

### 1.2 Scope
CRSS is **campus-only**: every account is tied to a college email domain and a role
(student, faculty, club/department, admin). It is explicitly **not** a neighborhood or
public marketplace, and it does not handle monetary transactions beyond an optional,
informal refundable deposit tracked for accountability (no real payment gateway is in scope).

In scope:
- Resource listing, discovery, and borrowing workflow
- Role-based accounts and campus profile data
- Notifications (in-app, real-time via WebSocket, and email)
- Reviews, complaints, and admin moderation
- Admin analytics dashboard

Out of scope (for this build):
- Payment gateway integration
- Cross-campus / multi-tenant support
- Native mobile apps (the web frontend is responsive but not packaged as an app)

### 1.3 Definitions, Acronyms, Abbreviations
| Term | Meaning |
|---|---|
| CRSS | Campus Resource Sharing System |
| JWT | JSON Web Token, used for stateless authentication |
| RBAC | Role-Based Access Control |
| SPA | Single Page Application (the React frontend) |
| Lender | The user who owns and lists a resource |
| Borrower | The user requesting to use a resource |

### 1.4 References
- FastAPI documentation (fastapi.tiangolo.com)
- SQLAlchemy 2.0 documentation
- OWASP Top 10 (for the security requirements in §4.5)

---

## 2. Overall Description

### 2.1 Product Perspective
CRSS is a new, standalone three-tier web application: a React SPA frontend, a FastAPI REST
backend, and a PostgreSQL database, with Redis supporting caching, rate limiting, and the
Celery task queue.

### 2.2 User Classes and Characteristics
| Role | Description | Typical goals |
|---|---|---|
| Student | Primary user class | List items they own; borrow items they need |
| Faculty | Same borrowing capabilities as students, plus higher inherent trust | Lend department equipment; borrow for research/teaching |
| Club/Department | Represents a shared account for a club or department | List shared equipment (soldering stations, projectors) |
| Admin | Platform operators (usually IT staff or a student council) | Moderate users/resources, resolve complaints, view analytics |

### 2.3 Operating Environment
- Backend: containerized Python 3.12 (FastAPI/Uvicorn) behind Nginx in production
- Database: PostgreSQL 16
- Frontend: any evergreen browser (Chrome, Firefox, Safari, Edge), responsive down to
  360px-wide mobile viewports
- Deployment: Docker Compose (VPS) or managed platforms (Render/Railway)

### 2.4 Design and Implementation Constraints
- Must use FastAPI + SQLAlchemy + PostgreSQL on the backend (project mandate)
- Must use React + Tailwind CSS on the frontend (project mandate)
- Must run fully via `docker compose up`
- JWT-based auth only (no server-side session storage) to keep the API stateless and horizontally scalable

### 2.5 Assumptions and Dependencies
- Users have a valid college email address (email-domain restriction can be added at
  registration in a future iteration; the current build validates format, not domain)
- The college provides (or the deployer configures) SMTP credentials for transactional email
- Redis and PostgreSQL are reachable from the backend container at runtime

---

## 3. Functional Requirements

Each requirement is tagged `FR-<area>-<n>` and maps to an implemented API endpoint.

### 3.1 Authentication & Account Management
- **FR-AUTH-1**: The system shall allow a new user to register with full name, email,
  password, and role (student/faculty/club).
- **FR-AUTH-2**: The system shall hash passwords with bcrypt before storage; plaintext
  passwords shall never be persisted or logged.
- **FR-AUTH-3**: The system shall issue a short-lived JWT access token (30 min default)
  and a longer-lived refresh token (7 days default) on successful login.
- **FR-AUTH-4**: The system shall allow silent access-token renewal via the refresh token
  without requiring re-entry of credentials.
- **FR-AUTH-5**: The system shall support email-based password reset via a time-limited token.
- **FR-AUTH-6**: The system shall support email verification via a time-limited token sent
  at registration.
- **FR-AUTH-7**: The system shall reject login for suspended or deactivated accounts.

### 3.2 Profile Management
- **FR-PROF-1**: A user shall be able to view and edit their own profile (name, department,
  course, year, bio, skills, phone, profile picture).
- **FR-PROF-2**: A user shall be able to change their password after providing their
  current password.

### 3.3 Resource Management
- **FR-RES-1**: A user shall be able to list a resource with title, description, category,
  condition, quantity, pickup location, tags, deposit amount, and max borrow duration.
- **FR-RES-2**: The owner (or an admin) shall be able to edit or delete a resource listing.
- **FR-RES-3**: A user shall be able to upload one or more images for a resource, with one
  marked primary.
- **FR-RES-4**: Any authenticated user shall be able to browse resources with search,
  category/condition/status/department filters, minimum-rating filter, sorting, and pagination.
- **FR-RES-5**: The system shall track `quantity` vs `quantity_available` and update
  `status` (available/borrowed/unavailable) automatically as borrow requests are
  approved and returned.

### 3.4 Borrowing Workflow
- **FR-BOR-1**: A user shall be able to request to borrow an available resource for a
  date range, optionally stating a purpose.
- **FR-BOR-2**: A user shall not be able to request their own resource.
- **FR-BOR-3**: The resource owner shall be able to approve or reject a pending request,
  optionally with a rejection reason.
- **FR-BOR-4**: The borrower shall be able to cancel a request while it is pending or
  approved (but not yet active-returned).
- **FR-BOR-5**: The borrower shall be able to mark a borrow as returned, optionally
  attaching a damage report, which flags the request as `damaged` instead of `returned`.
- **FR-BOR-6**: Approving a request shall decrement `quantity_available`; returning shall
  increment it and increment the resource's `total_borrows` counter.

### 3.5 Reviews
- **FR-REV-1**: A user shall be able to leave a 1–5 star rating and optional comment on a
  resource **only if** they have a `returned` borrow record for it.
- **FR-REV-2**: The resource's `average_rating` shall recompute automatically when a new
  review is added.

### 3.6 Notifications
- **FR-NOT-1**: The system shall create an in-app notification when: a borrow request is
  created, approved, rejected, or a return is confirmed.
- **FR-NOT-2**: The system shall push notifications to a connected client in real time via
  WebSocket, in addition to persisting them for later retrieval.
- **FR-NOT-3**: The system shall send transactional emails for verification, password
  reset, new borrow requests, and next-day return reminders.
- **FR-NOT-4**: A user shall be able to mark one or all notifications as read.

### 3.7 Complaints & Support
- **FR-COMP-1**: A user shall be able to file a complaint against a user or resource with
  a subject and description.
- **FR-COMP-2**: An admin shall be able to list all complaints, change their status
  (open/in-progress/resolved/closed), and attach a response.

### 3.8 Admin Functions
- **FR-ADM-1**: An admin shall be able to list all users, and suspend/unsuspend an account.
- **FR-ADM-2**: An admin shall be able to create and delete resource categories.
- **FR-ADM-3**: An admin shall be able to view platform-wide analytics: total users,
  resources, borrows, pending requests, active borrows, most-borrowed categories,
  top contributors, and department usage.

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **NFR-PERF-1**: List/search endpoints shall support pagination to keep individual
  response payloads bounded regardless of catalog size.
- **NFR-PERF-2**: Database access shall use indexed columns for the fields most queried
  (`email`, `student_id`, `resource.status`, `borrow_request.status`).

### 4.2 Scalability
- **NFR-SCALE-1**: The backend shall be stateless (JWT auth, no server-side sessions) so
  multiple backend replicas can run behind a load balancer.
- **NFR-SCALE-2**: Rate limiting shall be Redis-backed so limits are enforced consistently
  across replicas, not per-process.

### 4.3 Availability & Reliability
- **NFR-AVAIL-1**: Docker Compose health checks shall gate backend/worker startup on
  Postgres and Redis being ready.
- **NFR-AVAIL-2**: Background email/reminder failures shall be logged, not silently
  swallowed, and shall not block the primary request/response cycle (dispatched via
  FastAPI `BackgroundTasks` or Celery).

### 4.4 Usability
- **NFR-USE-1**: The frontend shall be responsive from 360px to desktop widths.
- **NFR-USE-2**: Destructive or state-changing actions (suspend, delete, reject) shall
  give the user clear, immediate feedback (toast notifications).

### 4.5 Security
- **NFR-SEC-1**: Passwords hashed with bcrypt (via passlib).
- **NFR-SEC-2**: JWT access/refresh tokens, HS256-signed, with configurable expiry.
- **NFR-SEC-3**: All state-changing endpoints require authentication except registration
  and login.
- **NFR-SEC-4**: Role checks enforced server-side via FastAPI dependencies
  (`require_admin`, `require_roles`), never trusting client-supplied role claims alone
  for authorization decisions beyond convenience display.
- **NFR-SEC-5**: Input validated via Pydantic schemas on every endpoint; SQL access is
  exclusively through the SQLAlchemy ORM (parameterized queries), preventing SQL injection.
- **NFR-SEC-6**: File uploads validated by MIME type, extension, and size before being
  written to disk.
- **NFR-SEC-7**: CSRF defense-in-depth via double-submit-cookie pattern for any
  cookie-authenticated flows.
- **NFR-SEC-8**: Login endpoint rate-limited (5/min per IP) to slow credential-stuffing attacks.

### 4.6 Maintainability
- **NFR-MAINT-1**: Backend organized in layers (models / schemas / routers / services)
  so business logic is not duplicated across route handlers.
- **NFR-MAINT-2**: Schema evolution managed via Alembic migrations, not manual SQL.

---

## 5. External Interface Requirements

### 5.1 REST API
See `docs/API_DOCUMENTATION.md` and the live Swagger UI at `/docs` for the full endpoint
contract (request/response schemas, status codes).

### 5.2 WebSocket
`ws://<host>/ws/notifications?token=<jwt>` — pushes JSON notification payloads to the
connected client as they are created server-side.

---

## 6. Appendix: Traceability Summary

| Requirement group | Implemented in |
|---|---|
| FR-AUTH-* | `app/routers/auth.py`, `app/core/security.py` |
| FR-PROF-* | `app/routers/users.py` |
| FR-RES-* | `app/routers/resources.py`, `app/routers/uploads.py` |
| FR-BOR-* | `app/routers/borrow.py` |
| FR-REV-* | `app/routers/reviews.py` |
| FR-NOT-* | `app/services/notification_service.py`, `app/routers/websocket.py`, `app/services/email_service.py` |
| FR-COMP-* | `app/routers/complaints.py` |
| FR-ADM-* | `app/routers/users.py`, `app/routers/categories.py`, `app/routers/admin_analytics.py` |
