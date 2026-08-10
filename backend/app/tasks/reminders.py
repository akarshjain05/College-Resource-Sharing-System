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
                link=f"/my-bookings?id={br.id}",
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
        overdue_active = (
            db.query(BorrowRequest)
            .filter(
                BorrowRequest.status == BorrowStatus.ACTIVE,
                BorrowRequest.requested_end_date < today
            )
            .all()
        )
        for br in overdue_active:
            br.status = BorrowStatus.LATE
            create_notification(
                db, br.borrower_id, NotificationType.SYSTEM, "Item Overdue",
                f"Your borrow for '{br.resource.title}' is overdue! Please return it immediately to avoid further penalties.",
                link=f"/my-bookings?id={br.id}",
            )
            create_notification(
                db, br.lender_id, NotificationType.SYSTEM, "Item Overdue",
                f"The borrow for '{br.resource.title}' by {br.borrower.full_name} is overdue.",
                link=f"/my-bookings?id={br.id}",
            )
            marked += 1
            
        # Cancel and refund borrows that were never handed over
        from app.models.payment import Payment
        from app.models.enums import PaymentStatus
        from app.services import payment_service
        from sqlalchemy.orm import joinedload
        from app.services.email_service import send_payment_refund_email

        expired_unfulfilled = (
            db.query(BorrowRequest)
            .filter(
                BorrowRequest.status.in_([BorrowStatus.REQUESTED, BorrowStatus.APPROVED, BorrowStatus.HANDOVER_REQUESTED]),
                BorrowRequest.requested_end_date < today
            )
            .all()
        )
        cancelled = 0
        for br in expired_unfulfilled:
            # Issue refund if they paid
            payment = db.query(Payment).options(joinedload(Payment.payer)).filter(
                Payment.borrow_request_id == br.id, Payment.status == PaymentStatus.PAID
            ).first()
            
            if payment:
                try:
                    result = payment_service.refund_payment(
                        db, payment, amount_paise=payment.total_amount,
                        notes={"reason": "borrow_window_expired_unfulfilled"},
                    )
                    
                    if payment.payer and payment.payer.email:
                        asyncio.run(
                            send_payment_refund_email(
                                payment.payer.email,
                                payment.payer.full_name,
                                payment.total_amount / 100.0,
                                br.resource.title if br.resource else "item",
                                result["id"]
                            )
                        )
                except Exception as e:
                    logger.error(f"Failed to refund expired borrow {br.id}: {e}")
                    
            br.status = BorrowStatus.CANCELLED
            create_notification(
                db, br.borrower_id, NotificationType.SYSTEM, "Borrow Cancelled",
                f"Your request for '{br.resource.title}' expired without handover and was auto-cancelled.",
                link=f"/borrow-requests/{br.id}",
            )
            cancelled += 1

        db.commit()
        logger.info("Marked %d borrows as late, auto-cancelled %d unfulfilled", marked, cancelled)
        return {"borrows_marked_late": marked, "borrows_auto_cancelled": cancelled}
    finally:
        db.close()


@celery_app.task(name="app.tasks.reminders.check_overdue_complaints")
def check_overdue_complaints():
    """Find complaints sitting unresolved for > 48 hours and send reminder nudges."""
    db = SessionLocal()
    nudged = 0
    try:
        from datetime import datetime, timedelta
        from app.models.misc import Complaint
        from app.models.enums import ComplaintStatus

        cutoff = datetime.utcnow() - timedelta(hours=48)
        overdue_complaints = (
            db.query(Complaint)
            .filter(
                Complaint.status.in_([ComplaintStatus.OPEN, ComplaintStatus.ASSIGNED]),
                Complaint.created_at <= cutoff
            )
            .all()
        )
        for comp in overdue_complaints:
            target_user_id = comp.assigned_to_id or comp.against_user_id
            if target_user_id:
                create_notification(
                    db,
                    target_user_id,
                    NotificationType.COMPLAINT_UPDATE,
                    "Unresolved Complaint Reminder",
                    f"Complaint '{comp.subject}' has been unresolved for > 48 hours. Please triage or resolve it.",
                    link="/complaints",
                )
                nudged += 1
        db.commit()
        logger.info("Nudged %d overdue complaints", nudged)
        return {"complaints_nudged": nudged}
    finally:
        db.close()

