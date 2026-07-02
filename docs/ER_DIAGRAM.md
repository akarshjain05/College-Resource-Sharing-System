# Entity-Relationship Diagram — Description

## Entities and Attributes

### `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| full_name | varchar(150) | |
| email | varchar(255) | unique, indexed |
| hashed_password | varchar(255) | bcrypt hash, never returned by the API |
| role | enum(student, faculty, club, admin) | |
| student_id | varchar(50) | unique, nullable |
| department, course, year_of_study | varchar/int | nullable |
| bio, skills | text | nullable |
| profile_picture_url | varchar(500) | nullable |
| phone_number | varchar(20) | nullable |
| is_verified, is_active, is_suspended | boolean | |
| trust_score, sharing_score | int | gamification counters |
| created_at, updated_at | timestamptz | |

### `categories`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| name | varchar(100) | unique |
| slug | varchar(100) | unique, indexed |
| description | varchar(500) | nullable |
| icon | varchar(100) | nullable |
| parent_id | UUID (FK → categories.id) | nullable, self-referential (subcategories) |

### `resources`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| title | varchar(200) | indexed |
| description | text | |
| condition | enum(new, good, fair, worn) | |
| status | enum(available, borrowed, unavailable, pending_approval) | indexed |
| quantity, quantity_available | int | |
| pickup_location | varchar(200) | nullable |
| tags | varchar(500) | comma-separated |
| barcode | varchar(100) | unique, nullable |
| qr_code_url | varchar(500) | nullable |
| deposit_amount | numeric(10,2) | |
| max_borrow_days | int | |
| average_rating | numeric(3,2) | denormalized, recomputed on new review |
| total_borrows, view_count | int | |
| owner_id | UUID (FK → users.id) | |
| category_id | UUID (FK → categories.id) | |

### `resource_images`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| resource_id | UUID (FK → resources.id) | cascade delete |
| image_url | varchar(500) | |
| is_primary | boolean | |

### `borrow_requests`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| resource_id | UUID (FK → resources.id) | cascade delete |
| borrower_id | UUID (FK → users.id) | |
| lender_id | UUID (FK → users.id) | denormalized copy of `resource.owner_id` at request time |
| status | enum(requested, approved, rejected, cancelled, active, return_requested, returned, late, damaged) | indexed |
| requested_start_date, requested_end_date, actual_return_date | date | |
| purpose | text | nullable |
| deposit_paid | numeric(10,2) | |
| damage_report, rejection_reason | text | nullable |

### `reviews`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| resource_id | UUID (FK → resources.id) | cascade delete |
| reviewer_id | UUID (FK → users.id) | |
| rating | int | 1–5 |
| comment | text | nullable |

### `notifications`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK → users.id) | cascade delete |
| type | enum(borrow_request, borrow_approved, borrow_rejected, return_reminder, return_confirmed, new_review, system) | |
| title, message | varchar/text | |
| is_read | boolean | |
| link | varchar(500) | nullable, frontend deep-link |

### `complaints`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| filed_by_id | UUID (FK → users.id) | |
| against_user_id | UUID (FK → users.id) | nullable |
| resource_id | UUID (FK → resources.id) | nullable |
| subject, description | varchar/text | |
| status | enum(open, in_progress, resolved, closed) | |
| admin_response | text | nullable |

### `audit_logs`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| actor_id | UUID (FK → users.id) | nullable (system-initiated actions) |
| action | varchar(150) | |
| entity_type, entity_id | varchar | |
| details | text | nullable |
| ip_address | varchar(50) | nullable |

## Relationships

```
users (1) ───< (N) resources            "owns"
users (1) ───< (N) borrow_requests      "borrows"      (via borrower_id)
users (1) ───< (N) borrow_requests      "lends"        (via lender_id)
users (1) ───< (N) reviews              "writes"
users (1) ───< (N) notifications        "receives"
users (1) ───< (N) complaints           "files"        (via filed_by_id)

categories (1) ───< (N) resources
categories (1) ───< (N) categories      "has subcategories" (self-referential)

resources (1) ───< (N) resource_images
resources (1) ───< (N) borrow_requests
resources (1) ───< (N) reviews
```

## Normalization Notes
- The schema is in **3NF**: every non-key attribute depends only on its table's primary
  key, not on other non-key attributes. The one intentional denormalization is
  `resource.average_rating`, a cached aggregate recomputed on write to avoid an
  `AVG()` join on every resource-list request — a standard, deliberate trade-off for
  read-heavy denormalization.
- `borrow_requests.lender_id` duplicates `resources.owner_id` at the time of the
  request. This is intentional: if resource ownership ever transfers, historical borrow
  records should still reflect who actually approved/handled that specific transaction.

## Indexes
- `users.email` (unique), `users.student_id` (unique)
- `categories.slug` (unique)
- `resources.title`, `resources.status`
- `borrow_requests.status`
- All primary keys (UUID) are indexed by default; all foreign key columns benefit from
  Postgres' automatic btree indexing on constraint creation in this schema's usage
  pattern (small-to-medium row counts expected for a single-campus deployment).
