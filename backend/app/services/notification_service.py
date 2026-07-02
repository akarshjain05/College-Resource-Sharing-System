"""
Helper for creating in-app notifications. Persists to the database and, if the
target user has an active WebSocket connection, pushes the notification to them
in real time. Email dispatch is handled separately via BackgroundTasks from the
router layer.
"""
import uuid

from sqlalchemy.orm import Session

from app.models.misc import Notification
from app.models.enums import NotificationType
from app.services.ws_manager import manager


def create_notification(
    db: Session,
    user_id: uuid.UUID,
    notif_type: NotificationType,
    title: str,
    message: str,
    link: str | None = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        type=notif_type,
        title=title,
        message=message,
        link=link,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    manager.notify_user(
        user_id,
        {
            "id": str(notification.id),
            "type": notification.type.value,
            "title": notification.title,
            "message": notification.message,
            "link": notification.link,
            "created_at": notification.created_at.isoformat(),
        },
    )

    return notification
