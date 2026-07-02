# Data Flow Diagrams (DFD)

Diagrams are described in structured text form (process/data-store/external-entity/flow),
suitable for redrawing in any DFD tool (draw.io, Lucidchart, etc.) for a viva presentation.

---

## DFD Level 0 — Context Diagram

**External entities:** Student, Faculty, Club/Department Account, Admin, Email Server (SMTP)

**Single process:** `0. Campus Resource Sharing System`

**Flows:**
```
Student/Faculty/Club  --(registration data, login credentials, resource listings,
                          borrow requests, reviews, complaints)-->  CRSS
CRSS  --(auth tokens, resource listings, request status, notifications)-->  Student/Faculty/Club
Admin  --(moderation actions, category management)-->  CRSS
CRSS  --(analytics, user/resource data)-->  Admin
CRSS  --(verification/reset/reminder emails)-->  Email Server
```

---

## DFD Level 1 — Major Subsystems

Processes:
1. **1.0 Authentication & Account Management**
2. **2.0 Resource Management**
3. **3.0 Borrowing Workflow**
4. **4.0 Notification & Communication**
5. **5.0 Review & Trust System**
6. **6.0 Admin & Moderation**

Data stores:
- **D1 Users**
- **D2 Categories**
- **D3 Resources / Resource Images**
- **D4 Borrow Requests**
- **D5 Reviews**
- **D6 Notifications**
- **D7 Complaints**

```
User --registration/login--> 1.0 --> D1
1.0 --auth token--> User

User --list/edit resource--> 2.0 --> D2, D3
2.0 --resource catalog--> User

User --borrow/approve/return--> 3.0 --> D4
3.0 --reads/writes availability--> D3
3.0 --triggers--> 4.0

3.0/5.0/6.0 --events--> 4.0 --> D6
4.0 --email--> Email Server
4.0 --websocket push--> User

User --review (post-return)--> 5.0 --> D5
5.0 --updates avg rating--> D3

Admin --moderation actions--> 6.0 --> D1, D2, D7
6.0 --analytics query--> D1, D3, D4
6.0 --dashboard data--> Admin
```

---

## DFD Level 2 — Decomposition of 3.0 Borrowing Workflow

Sub-processes:
- **3.1 Create Borrow Request** — validates resource availability and self-borrow rule,
  writes a new D4 row with status `requested`, triggers 4.0 (notify lender).
- **3.2 Approve / Reject Request** — lender-only; on approve, decrements
  `quantity_available` in D3 and sets D4 status to `approved`; on reject, sets status to
  `rejected` with a reason. Triggers 4.0 (notify borrower).
- **3.3 Cancel Request** — borrower-only, while status is `requested` or `approved`;
  reverses the `quantity_available` decrement if it had been approved.
- **3.4 Return Resource** — borrower-only, while status is `approved`; sets
  `actual_return_date`, increments `quantity_available` and `total_borrows` on D3,
  transitions D4 status to `returned` (or `damaged` if a damage report is attached).
  Triggers 4.0 (notify lender) and unlocks 5.0 (review eligibility).
- **3.5 Scheduled Return Reminder** *(Celery Beat, not user-triggered)* — daily job scans
  D4 for `approved` requests due tomorrow, triggers 4.0 for each.

---

## DFD Level 2 — Decomposition of 4.0 Notification & Communication

Sub-processes:
- **4.1 Create In-App Notification** — writes a row to D6.
- **4.2 Real-Time Push** — if the target user has an active WebSocket connection, the
  notification payload is pushed immediately; otherwise it waits in D6 until the user
  next polls `GET /notifications`.
- **4.3 Transactional Email Dispatch** — for specific event types (borrow request,
  verification, password reset, return reminder), renders an HTML template and hands it
  to a `BackgroundTask` (request-triggered events) or the Celery worker (scheduled
  reminders) for SMTP delivery, so the triggering HTTP request is never blocked on
  network I/O to the mail server.
