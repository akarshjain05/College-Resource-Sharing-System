ALTER TYPE userrole RENAME VALUE 'STUDENT' TO 'student';
ALTER TYPE userrole RENAME VALUE 'FACULTY' TO 'faculty';
ALTER TYPE userrole RENAME VALUE 'CLUB' TO 'club';
ALTER TYPE userrole RENAME VALUE 'ADMIN' TO 'admin';

ALTER TYPE resourcecondition RENAME VALUE 'NEW' TO 'new';
ALTER TYPE resourcecondition RENAME VALUE 'GOOD' TO 'good';
ALTER TYPE resourcecondition RENAME VALUE 'FAIR' TO 'fair';
ALTER TYPE resourcecondition RENAME VALUE 'WORN' TO 'worn';

ALTER TYPE resourcestatus RENAME VALUE 'AVAILABLE' TO 'available';
ALTER TYPE resourcestatus RENAME VALUE 'BORROWED' TO 'borrowed';
ALTER TYPE resourcestatus RENAME VALUE 'UNAVAILABLE' TO 'unavailable';
ALTER TYPE resourcestatus RENAME VALUE 'PENDING_APPROVAL' TO 'pending_approval';

ALTER TYPE borrowstatus RENAME VALUE 'REQUESTED' TO 'requested';
ALTER TYPE borrowstatus RENAME VALUE 'APPROVED' TO 'approved';
ALTER TYPE borrowstatus RENAME VALUE 'REJECTED' TO 'rejected';
ALTER TYPE borrowstatus RENAME VALUE 'CANCELLED' TO 'cancelled';
ALTER TYPE borrowstatus RENAME VALUE 'ACTIVE' TO 'active';
ALTER TYPE borrowstatus RENAME VALUE 'RETURN_REQUESTED' TO 'return_requested';
ALTER TYPE borrowstatus RENAME VALUE 'RETURNED' TO 'returned';
ALTER TYPE borrowstatus RENAME VALUE 'LATE' TO 'late';
ALTER TYPE borrowstatus RENAME VALUE 'DAMAGED' TO 'damaged';

ALTER TYPE complaintstatus RENAME VALUE 'OPEN' TO 'open';
ALTER TYPE complaintstatus RENAME VALUE 'IN_PROGRESS' TO 'in_progress';
ALTER TYPE complaintstatus RENAME VALUE 'RESOLVED' TO 'resolved';
ALTER TYPE complaintstatus RENAME VALUE 'CLOSED' TO 'closed';

ALTER TYPE notificationtype RENAME VALUE 'BORROW_REQUEST' TO 'borrow_request';
ALTER TYPE notificationtype RENAME VALUE 'BORROW_APPROVED' TO 'borrow_approved';
ALTER TYPE notificationtype RENAME VALUE 'BORROW_REJECTED' TO 'borrow_rejected';
ALTER TYPE notificationtype RENAME VALUE 'RETURN_REMINDER' TO 'return_reminder';
ALTER TYPE notificationtype RENAME VALUE 'RETURN_CONFIRMED' TO 'return_confirmed';
ALTER TYPE notificationtype RENAME VALUE 'NEW_REVIEW' TO 'new_review';
ALTER TYPE notificationtype RENAME VALUE 'SYSTEM' TO 'system';
