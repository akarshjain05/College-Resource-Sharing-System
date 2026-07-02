# Project Report
## Campus Resource Sharing System (CRSS)

*A Major Project Report*

---

## Certificate / Declaration Placeholder

> This is a template placeholder. Replace with your institution's standard certificate
> and declaration pages (student name, roll number, guide name, department, and
> institution letterhead) before submission — these are institution-specific and cannot
> be generated generically.

---

## Acknowledgements

> Placeholder — thank your project guide, HOD, and department as per your institution's
> convention.

---

## Table of Contents

1. Introduction
2. Literature Survey / Existing System Analysis
3. Problem Statement & Objectives
4. Requirements Analysis
5. System Design
6. Database Design
7. Implementation
8. Testing
9. Results & Screenshots
10. Deployment
11. Conclusion & Future Scope
12. References
13. Appendices

---

## Chapter 1: Introduction

College campuses generate significant idle inventory: clubs and departments purchase
specialized equipment (soldering stations, DSLRs, projectors) used only intermittently;
individual students buy items (calculators, reference books, sports gear) that a
neighbor down the hall likely already owns. This project, the **Campus Resource Sharing
System (CRSS)**, addresses that inefficiency with a purpose-built, campus-scoped lending
platform — not a general marketplace, but a tool that assumes its users share an
institution, a set of social norms, and (via role fields like department/course/year)
enough context to lend to each other with reasonable trust.

The system is built as a modern three-tier web application: a React single-page
application frontend, a FastAPI REST + WebSocket backend, and a PostgreSQL database,
containerized end-to-end with Docker Compose for reproducible setup.

## Chapter 2: Literature Survey / Existing System Analysis

**General marketplaces (OLX, Facebook Marketplace):** support arbitrary buy/sell between
strangers, with no borrowing lifecycle, no campus scoping, and no return-tracking —
unsuitable for a lend-and-return use case where the same physical item needs to change
hands multiple times over its life.

**Peer-to-peer rental platforms (e.g. general "rent anything" apps):** closer in spirit,
but built around payment processing and broad geographic reach, adding complexity
(payment compliance, dispute resolution across strangers) that a single-campus,
low/no-monetary-stakes context doesn't need.

**University-internal tools (shared spreadsheets, WhatsApp/Telegram groups):** the
actual status quo at most colleges today. These have no structured availability
tracking, no accountability (who currently has an item), no notification system, and no
audit trail — exactly the gaps CRSS is designed to close.

**Positioning:** CRSS sits deliberately between these — structured enough to track
borrow state, availability, and accountability (trust/sharing scores, review gating),
but without the overhead of payment processing or stranger-trust mechanisms a general
marketplace needs.

## Chapter 3: Problem Statement & Objectives

**Problem statement:** *Students, faculty, and clubs within a college frequently
purchase or own resources that remain idle most of the time, while other members of the
same campus buy duplicates unnecessarily, because there is no structured, trustworthy
way to discover and borrow what's already available nearby.*

**Objectives:**
1. Let any campus member list a resource they own and are willing to lend.
2. Let any campus member discover and request to borrow available resources, filtered
   and searched by category, condition, and rating.
3. Track the full borrow lifecycle (request → approve/reject → active → return, with
   damage reporting) so accountability is structural, not just social.
4. Notify participants in real time as their requests change state.
5. Give administrators moderation tools (user suspension, complaint resolution) and
   visibility (analytics) into platform health.
6. Ship the whole system in a form any team member (or grader) can stand up locally with
   a single command.

Full functional/non-functional requirements: see `docs/SRS.md`.

## Chapter 4: Requirements Analysis
See `docs/SRS.md` for the complete functional requirement catalog (tagged
`FR-<area>-<n>`) and non-functional requirements (performance, scalability, security,
etc.), each mapped to its implementing module.

## Chapter 5: System Design
See `docs/SOFTWARE_DESIGN_DOCUMENT.md` for the layered backend architecture, key design
decisions (and their rationale — UUID keys, sync ORM + async WebSocket bridge, JWT
statelessness, Celery for scheduled jobs), and the frontend's state-management and
visual-design approach.

See `docs/UML_DIAGRAMS.md` for the use case, class, sequence, activity, and deployment
diagrams (described in redrawable structured text), and `docs/DFD.md` for data flow
diagrams at levels 0–2.

## Chapter 6: Database Design
See `docs/ER_DIAGRAM.md` for the full entity-relationship model: nine tables
(`users`, `categories`, `resources`, `resource_images`, `borrow_requests`, `reviews`,
`notifications`, `complaints`, `audit_logs`), their attributes, relationships,
normalization notes (3NF, with one deliberate denormalization — cached
`average_rating` — justified by read/write ratio), and indexing strategy.

## Chapter 7: Implementation

### 7.1 Technology Stack
| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router v6, Tailwind CSS, Axios, Recharts, lucide-react |
| Backend | FastAPI, SQLAlchemy 2.0 (ORM), Pydantic v2, Alembic (migrations) |
| Database | PostgreSQL 16 |
| Caching / Broker | Redis 7 |
| Background jobs | Celery (worker + beat) |
| Auth | JWT (python-jose), bcrypt (passlib) |
| Real-time | Native WebSocket (FastAPI) |
| Containerization | Docker, Docker Compose |

### 7.2 Module Breakdown
The backend is organized into `core` (config/db/security/deps/exceptions/logging/rate
limiting), `models` (SQLAlchemy ORM), `schemas` (Pydantic I/O contracts), `routers`
(HTTP/WebSocket endpoints), `services` (notification + email business logic), `tasks`
(Celery jobs), and `utils` (file upload handling) — see `docs/SOFTWARE_DESIGN_DOCUMENT.md`
§3 for the full rationale behind this layering.

The frontend mirrors this with `api` (Axios client + typed endpoint wrappers),
`context` (auth state), `layouts` (shell/admin chrome), `components` (shared UI:
`ResourceCard`, `StatCard`, `ProtectedRoute`), `hooks` (`useNotificationSocket`), and
`pages` grouped by domain (`auth/`, `resources/`, `borrow/`, `profile/`, `admin/`).

### 7.3 Notable Implementation Challenges
1. **Bridging sync request handling to async WebSocket push** — solved via
   `asyncio.run_coroutine_threadsafe`, binding the main event loop at startup so
   notification creation (called from a sync route running in FastAPI's threadpool) can
   safely schedule a coroutine back onto the loop that owns the WebSocket connections.
2. **Consistent error contracts across every failure mode** — solved with a centralized
   exception hierarchy (`AppException` and subclasses) and handlers for validation,
   integrity, and generic errors, so the frontend can branch on a stable `error_code`
   rather than parsing free-text messages.
3. **Review-gating on actual borrow history** — implemented by querying for a `returned`
   `BorrowRequest` belonging to the reviewer for that resource before allowing a review,
   preventing fabricated ratings.

## Chapter 8: Testing
See `docs/TESTING_REPORT.md` for full coverage details. Summary: 22 automated API/integration
test cases across authentication, resource CRUD, the full borrow lifecycle, and admin
RBAC, run via pytest + FastAPI's `TestClient` against an isolated in-memory SQLite
database (zero external setup required). Frontend `.jsx` files were verified for
syntactic correctness at generation time; a Vitest/RTL component suite is noted as a
recommended addition, not yet included.

## Chapter 9: Results & Screenshots

> Placeholder — insert screenshots of: the login/register pages, the dashboard, the
> resource browse/search page, a resource detail page with an active borrow request, the
> borrow-requests page (both tabs), the admin analytics dashboard with charts, and the
> admin user-management table. Capture these from your own running instance
> (`docker compose up`) since they reflect your actual seeded data.

## Chapter 10: Deployment
See `deployment/DEPLOYMENT_GUIDE.md` for three deployment paths (Ubuntu VPS with Nginx +
Certbot, Render, Railway), plus `docs/INSTALLATION_GUIDE.md` for local development setup
and a troubleshooting table.

## Chapter 11: Conclusion & Future Scope

CRSS demonstrates a complete, deployable answer to a genuinely common campus problem:
turning scattered, idle personal and departmental property into a searchable, trackable,
moderated shared pool. The system covers the full lifecycle a real deployment would need
— accounts and roles, listing and discovery, a stateful borrow workflow with
accountability hooks (reviews, trust scores, complaints), real-time and email
notification, and admin oversight — while remaining honest about what's intentionally
out of scope for this iteration.

**Future scope:**
- Native mobile apps (the responsive web frontend covers mobile browsers today, but not
  push notifications when the browser tab is closed)
- Real payment-gateway-backed deposits, rather than tracked-but-informal deposit amounts
- Dark mode and further accessibility passes (keyboard navigation audit, screen-reader
  labeling)
- A frontend automated test suite (Vitest + React Testing Library)
- An in-app "promote user to admin" flow with audit logging, replacing the current
  direct-database-edit approach for granting the first admin account
- Concurrency hardening on borrow approval (row-level locking to eliminate the
  double-approval race condition noted in `docs/VIVA_QUESTIONS.md`)
- Map-based "pickup location" visualization for larger campuses

## Chapter 12: References
- FastAPI documentation — https://fastapi.tiangolo.com
- SQLAlchemy 2.0 documentation — https://docs.sqlalchemy.org
- React documentation — https://react.dev
- Tailwind CSS documentation — https://tailwindcss.com
- OWASP Top 10 — https://owasp.org/www-project-top-ten/
- PostgreSQL documentation — https://www.postgresql.org/docs/

## Chapter 13: Appendices
- Appendix A: Full API reference — `docs/API_DOCUMENTATION.md`
- Appendix B: Entity-relationship model — `docs/ER_DIAGRAM.md`
- Appendix C: UML diagrams — `docs/UML_DIAGRAMS.md`
- Appendix D: Data flow diagrams — `docs/DFD.md`
- Appendix E: Software Requirements Specification — `docs/SRS.md`
- Appendix F: Software Design Document — `docs/SOFTWARE_DESIGN_DOCUMENT.md`
- Appendix G: Testing report — `docs/TESTING_REPORT.md`
- Appendix H: User manual — `docs/USER_MANUAL.md`
- Appendix I: Admin manual — `docs/ADMIN_MANUAL.md`
- Appendix J: Installation guide — `docs/INSTALLATION_GUIDE.md`
- Appendix K: Maintenance guide — `docs/MAINTENANCE_GUIDE.md`
- Appendix L: Viva question bank — `docs/VIVA_QUESTIONS.md`

---

*Note on this report's format: rather than duplicating the full text of every appendix
inline (which would make this single file enormous and harder to navigate), each chapter
above summarizes its topic and links to the dedicated document that covers it in full
depth. For a printed/PDF submission, you can concatenate this report with each appendix
document in order — they were written to read coherently in that sequence.*
