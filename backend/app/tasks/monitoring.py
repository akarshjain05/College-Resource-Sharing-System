import logging
from datetime import datetime, timedelta
import pytz

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
        now = datetime.now(pytz.UTC)
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

        logger.info("Security anomaly checks completed.")
    except Exception as exc:
        logger.exception("Error running security anomaly checks: %s", str(exc))
    finally:
        db.close()
