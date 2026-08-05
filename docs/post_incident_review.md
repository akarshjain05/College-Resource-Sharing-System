# Post-Incident Review (PIR) Template

*This document should be filled out within 48 hours of any production incident. The goal is blameless reflection to improve system resilience.*

## Incident Summary
- **Date:** [YYYY-MM-DD]
- **Authors:** [Names of people involved]
- **Status:** [Resolved / Mitigated / Ongoing]
- **Impact:** [e.g., "Users could not log in for 45 minutes", "10 bookings were double-booked"]

## Timeline
*(Include time, event, and how it was discovered)*
- **09:00:** Deployment X was pushed to production.
- **09:15:** First user reported login failures on Discord.
- **09:20:** Confirmed 500 errors in backend logs.
- **09:25:** Reverted deployment X and restarted containers.
- **09:30:** Service fully restored.

## Root Cause
*Describe the technical root cause. Ask "Why?" until you reach a process or architectural gap.*
- **Why did logins fail?** The database migration crashed halfway.
- **Why did it crash?** It tried to add a non-nullable column without a default value.
- **Why wasn't this caught?** The automated tests use SQLite which handles schema changes differently than Postgres in production.

## Action Items
*Concrete, ticketable tasks to prevent recurrence or improve response time.*
- [ ] Add Postgres to the CI/CD test pipeline instead of SQLite. (Owner: @username)
- [ ] Set up an alert for >10 HTTP 500 errors in a 5-minute window. (Owner: @username)
- [ ] Add the missing default value to the existing Alembic migration. (Owner: @username)
