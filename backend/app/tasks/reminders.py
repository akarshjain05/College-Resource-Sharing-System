"""
Scheduled task that finds active borrows due within the next day and
sends both an in-app notification and a reminder email to the borrower.
"""
import asyncio
import logging
from datetime import date, timedelta

from app.tasks.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.borrow import BorrowRequest
from app.models.enums import BorrowStatus, NotificationType
from app.services.notification_service import create_notification
from app.services.email_service import send_return_reminder_email

logger = logging.getLogger("crss")


@celery_app.task(name="app.tasks.reminders.send_return_reminders")
def send_return_reminders():
    db = SessionLocal()
    sent = 0
    try:
        tomorrow = date.today() + timedelta(days=1)
        due_soon = (
            db.query(BorrowRequest)
            .filter(BorrowRequest.status == BorrowStatus.ACTIVE, BorrowRequest.requested_end_date == tomorrow)
            .all()
        )
        for br in due_soon:
            create_notification(
                db,
                br.borrower_id,
                NotificationType.RETURN_REMINDER,
                "Return reminder",
                f"'{br.resource.title}' is due back tomorrow ({br.requested_end_date}).",
                link=f"/borrow-requests/{br.id}",
            )
            asyncio.run(
                send_return_reminder_email(
                    br.borrower.email,
                    br.borrower.full_name,
                    br.resource.title,
                    str(br.requested_end_date),
                )
            )
            sent += 1
        logger.info("Sent %d return reminders", sent)
        return {"reminders_sent": sent}
    finally:
        db.close()


@celery_app.task(name="app.tasks.reminders.mark_overdue_borrows_late")
def mark_overdue_borrows_late():
    db = SessionLocal()
    marked = 0
    try:
        today = date.today()
        overdue = (
            db.query(BorrowRequest)
            .filter(
                BorrowRequest.status.in_([BorrowStatus.ACTIVE, BorrowStatus.APPROVED]),
                BorrowRequest.requested_end_date < today
            )
            .all()
        )
        for br in overdue:
            br.status = BorrowStatus.LATE
            create_notification(
                db,
                br.borrower_id,
                NotificationType.SYSTEM,
                "Item Overdue",
                f"Your borrow for '{br.resource.title}' is overdue! Please return it immediately to avoid further penalties.",
                link=f"/borrow-requests/{br.id}",
            )
            create_notification(
                db,
                br.lender_id,
                NotificationType.SYSTEM,
                "Item Overdue",
                f"The borrow for '{br.resource.title}' by {br.borrower.full_name} is overdue.",
                link=f"/borrow-requests/{br.id}",
            )
            marked += 1
        
        db.commit()
        logger.info("Marked %d borrows as late", marked)
        return {"borrows_marked_late": marked}
    finally:
        db.close()
