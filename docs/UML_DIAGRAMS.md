# UML Diagram Descriptions

Described in structured text for redrawing in any UML tool for the viva presentation/report.

---

## 1. Use Case Diagram

**Actors:** Student, Faculty, Club/Department, Admin (Admin inherits all Student use cases
plus admin-only ones, shown with `<<extend>>`)

**Use cases:**
- Register / Login / Logout
- Reset Password / Verify Email
- Manage My Profile
- List a Resource
- Edit / Delete My Resource
- Upload Resource Images
- Browse & Search Resources
- Request to Borrow
- Approve / Reject Borrow Request *(as lender)*
- Cancel Borrow Request *(as borrower)*
- Return a Resource
- Leave a Review *(precondition: returned borrow exists)*
- View Notifications
- File a Complaint
- *(Admin only)* Manage Users (suspend/unsuspend)
- *(Admin only)* Manage Categories
- *(Admin only)* Resolve Complaints
- *(Admin only)* View Analytics Dashboard

Relationships:
- `Request to Borrow` `<<include>>` `Check Resource Availability`
- `Approve Borrow Request` `<<include>>` `Notify Borrower`
- `Return a Resource` `<<include>>` `Update Resource Availability`
- `Leave a Review` depends on (`<<extend>>` with precondition) a completed `Return a Resource`

---

## 2. Class Diagram

**Core domain classes** (mirroring the SQLAlchemy models in `app/models/`):

```
User
- id: UUID
- full_name, email, hashed_password: str
- role: UserRole
- trust_score, sharing_score: int
+ resources: List<Resource>
+ borrow_requests: List<BorrowRequest>
+ notifications: List<Notification>

Category
- id: UUID
- name, slug: str
- parent: Category (self-association)
+ resources: List<Resource>

Resource
- id: UUID
- title, description: str
- condition: ResourceCondition
- status: ResourceStatus
- quantity, quantity_available: int
- average_rating: float
+ owner: User
+ category: Category
+ images: List<ResourceImage>
+ borrow_requests: List<BorrowRequest>
+ reviews: List<Review>

BorrowRequest
- id: UUID
- status: BorrowStatus
- requested_start_date, requested_end_date, actual_return_date: date
+ resource: Resource
+ borrower: User
+ lender: User

Review
- id: UUID
- rating: int
- comment: str
+ resource: Resource
+ reviewer: User

Notification
- id: UUID
- type: NotificationType
- title, message: str
- is_read: bool
+ user: User

Complaint
- id: UUID
- subject, description: str
- status: ComplaintStatus
+ filed_by: User
+ against_user: User (optional)
```

**Associations:**
- `User "1" -- "0..*" Resource` (owns)
- `User "1" -- "0..*" BorrowRequest` (as borrower), `User "1" -- "0..*" BorrowRequest` (as lender)
- `Resource "1" -- "0..*" ResourceImage`
- `Resource "1" -- "0..*" Review`
- `Category "1" -- "0..*" Resource`
- `Category "0..1" -- "0..*" Category` (parent/subcategory, self-association)

---

## 3. Sequence Diagram — "Borrow a Resource" (happy path)

```
Borrower       Frontend         Backend API        Database         WS Manager      Lender's Browser
   |               |                  |                 |                |                 |
   |--fill dates--->|                 |                 |                |                 |
   |               |--POST /borrow-requests------------->|                |                 |
   |               |                  |--INSERT borrow_requests row------>|                |
   |               |                  |<--row created----|                 |                |
   |               |                  |--create_notification()------------>|                |
   |               |                  |                  |    INSERT notifications row      |
   |               |                  |                  |    notify_user(lender_id) ------->|
   |               |<--201 Created----|                 |                |   (WebSocket push, if connected)
   |<--toast: sent--|                 |                 |                |--toast: new request-->|
   |               |                  |                  |                |                 |
[Lender approves later]
Lender           Frontend         Backend API        Database         WS Manager    Borrower's Browser
   |--click Approve->|                |                 |               |                  |
   |                |--POST .../approve---------------->|               |                  |
   |                |                 |--UPDATE status='approved',      |                  |
   |                |                 |   resources.quantity_available -=1                  |
   |                |                 |--create_notification()---------->|                  |
   |                |                 |                 |               |--push----------->|
   |                |<--200 OK--------|                 |               |    toast: approved
```

---

## 4. Activity Diagram — Borrow Request State Machine

```
        [Start]
           |
   Borrower submits request
           |
      (status = requested)
           |
      Lender decision?
       /          \
  Approve        Reject
     |              |
(status=approved)  (status=rejected) --> [End]
     |
  Borrower cancels? --Yes--> (status=cancelled) --> [End]
     | No
  Borrower returns item
     |
  Damage reported?
    /        \
  Yes          No
   |            |
(status=damaged) (status=returned)
   |            |
   +------------+
        |
   Review eligible
        |
      [End]
```

---

## 5. Deployment Diagram

```
┌───────────────────────────── Docker host (VPS) ─────────────────────────────┐
│                                                                                │
│  ┌───────────────┐   ┌────────────────┐   ┌───────────────┐  ┌─────────────┐ │
│  │  frontend       │   │  backend        │   │  celery_worker │  │ celery_beat  │ │
│  │  (Nginx/Vite,   │   │  (Uvicorn,      │   │  (Celery)      │  │ (Celery beat)│ │
│  │   port 5173/80) │   │   port 8000)    │   │                │  │              │ │
│  └───────┬────────┘   └───────┬────────┘   └───────┬────────┘  └──────┬───────┘ │
│          │                    │                     │                  │        │
│          │        ┌───────────┴─────────────────────┴──────────────────┘        │
│          │        │                                                              │
│          ▼        ▼                                                              │
│   ┌─────────────┐  ┌─────────────┐                                               │
│   │ PostgreSQL   │  │   Redis      │                                               │
│   │ (db volume)  │  │ (broker/     │                                               │
│   │              │  │  rate-limit) │                                               │
│   └─────────────┘  └─────────────┘                                               │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────┘
              ▲
              │ HTTPS (public internet, via host Nginx + Certbot, optional)
              │
     ┌────────┴────────┐
     │   End user's      │
     │   browser          │
     └─────────────────┘
```

All backend/worker containers share the same Docker image (`backend/Dockerfile`) with
different `CMD` overrides, avoiding image drift between the API process and the
background-job processes.
