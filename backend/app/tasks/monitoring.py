import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, and_, func

from app.tasks.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.resource import Resource
from app.services.email_service import send_email

logger = logging.getLogger("crss")


def send_security_alert(subject: str, message: str) -> None:
    """Send a high-priority alert email to the security/admin team."""
    logger.warning("SECURITY ALERT: %s - %s", subject, message)
    # Ideally send to a configured admin group email.
    send_email("security@yourdomain.com", f"[CRSS Alert] {subject}", message)


@celery_app.task(name="app.tasks.monitoring.check_security_anomalies")
def check_security_anomalies() -> None:
    """
    Scheduled job to check for basic security anomalies in the database
    since we don't have an external log aggregator for 401s/429s.
    """
    logger.info("Running security anomaly checks...")
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        one_hour_ago = now - timedelta(hours=1)
        
        # 1. Check for unexpected admin account creations (should be rare)
        recent_admins = db.execute(
            select(func.count(User.id)).where(
                and_(
                    User.created_at >= one_hour_ago,
                    User.role == "admin"
                )
            )
        ).scalar_one()

        if recent_admins > 0:
            send_security_alert(
                "Unexpected Admin Account Creation",
                f"{recent_admins} new admin account(s) were created in the last hour. Please verify this was intended."
            )

        # 2. Check for resource creation outside business hours (e.g., 2 AM - 5 AM UTC)
        # Note: This is an example metric. If users can create resources anytime, this might be noisy.
        # But for an internal university tool, a spike in the middle of the night could indicate bot activity.
        if 2 <= now.hour <= 5:
            recent_resources = db.execute(
                select(func.count(Resource.id)).where(
                    Resource.created_at >= one_hour_ago
                )
            ).scalar_one()

            if recent_resources > 10:  # Threshold for anomaly
                send_security_alert(
                    "High Off-Hours Resource Creation",
                    f"{recent_resources} resources were created between 2 AM and 5 AM UTC in the last hour. Possible bot activity."
                )

        # 3. Check for Collusion / Highly Reciprocal Transactions
        from app.models.borrow import BorrowRequest
        from app.models.enums import BorrowStatus
        one_day_ago = now - timedelta(days=1)
        recent_borrows = db.execute(
            select(BorrowRequest.borrower_id, BorrowRequest.lender_id, func.count(BorrowRequest.id))
            .where(BorrowRequest.created_at >= one_day_ago)
            .group_by(BorrowRequest.borrower_id, BorrowRequest.lender_id)
        ).all()

        pair_counts = {}
        for borrower_id, lender_id, count in recent_borrows:
            pair = tuple(sorted([str(borrower_id), str(lender_id)]))
            pair_counts[pair] = pair_counts.get(pair, 0) + count

        for pair, count in pair_counts.items():
            if count > 5:
                send_security_alert(
                    "Possible Collusion / Trust Score Gaming",
                    f"Users {pair[0]} and {pair[1]} have had {count} borrow transactions between them in the last 24 hours. Please review."
                )

        logger.info("Security anomaly checks completed.")
    except Exception as exc:
        logger.exception("Error running security anomaly checks: %s", str(exc))
    finally:
        db.close()
