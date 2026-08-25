import uuid
import threading
import requests
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.misc import Notification
from app.models.enums import NotificationType
from app.services.ws_manager import manager
from app.core.config import settings


import logging
import logging
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger("crss")
_notification_pool = ThreadPoolExecutor(max_workers=20, thread_name_prefix="notif_fanout")

def _forward_post(url: str, headers: dict, payload: dict) -> None:
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=2.5)
        if resp.status_code >= 400:
            logger.warning("Notification microservice returned status %s: %s", resp.status_code, resp.text)
        else:
            logger.info("Successfully dispatched event '%s' to notification microservice", payload.get("event_type"))
    except Exception as exc:
        logger.warning("Could not reach notification microservice at %s: %s", url, exc)


def forward_to_microservice(
    user_id: str,
    email: str | None = None,
    title: str = "",
    message: str = "",
    link: str | None = None,
    event_type: str = "app.notification",
    channels: list[str] | None = None,
    force_delivery: bool = True,
    extra_payload: dict | None = None,
) -> None:
    if not settings.NOTIFICATION_SERVICE_URL:
        return

    url = f"{settings.NOTIFICATION_SERVICE_URL.rstrip('/')}/events"
    headers = {
        "X-API-Key": settings.NOTIFICATION_SERVICE_API_KEY,
        "Content-Type": "application/json",
    }
    
    event_payload = {
        "title": title,
        "message": message,
        "link": link,
    }
    if extra_payload:
        event_payload.update(extra_payload)

    payload = {
        "user_id": str(user_id),
        "event_type": event_type,
        "channels": channels or ["inapp", "push"],
        "force_delivery": force_delivery,
        "payload": event_payload,
    }
    if email:
        payload["contact_info"] = {"email": email}

    _notification_pool.submit(_forward_post, url, headers, payload)


def create_notification(
    db: Session,
    user_id: uuid.UUID,
    notif_type: NotificationType,
    title: str,
    message: str,
    link: str | None = None,
    event_type: str = "app.notification",
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

    try:
        created_at_val = (
            notification.created_at.isoformat()
            if getattr(notification, "created_at", None)
            else datetime.now(timezone.utc).isoformat()
        )
        notif_type_val = (
            notification.type.value
            if hasattr(notification.type, "value")
            else str(notification.type)
        )
        manager.notify_user(
            user_id,
            {
                "id": str(notification.id),
                "type": notif_type_val,
                "title": notification.title,
                "message": notification.message,
                "link": notification.link,
                "created_at": created_at_val,
            },
        )
    except Exception as exc:
        logger.warning("Failed to send WebSocket notification to user %s: %s", user_id, exc)

    try:
        from app.models.user import User
        user = db.query(User).filter(User.id == user_id).first()
        email = user.email if user else None
        forward_to_microservice(
            user_id=str(user_id),
            email=email,
            title=title,
            message=message,
            link=link,
            event_type=event_type,
        )
    except Exception as exc:
        logger.warning("Failed to queue microservice forwarding for user %s: %s", user_id, exc)

    return notification


def notify_all_except_owner_bg(
    owner_id: uuid.UUID,
    resource_id: uuid.UUID,
    resource_title: str,
    owner_name: str,
) -> None:
    from app.core.database import SessionLocal
    from app.models.user import User
    
    db = SessionLocal()
    try:
        other_users = db.query(User).filter(User.id != owner_id, User.notif_resource_listing == True).all()
        for user in other_users:
            create_notification(
                db=db,
                user_id=user.id,
                notif_type=NotificationType.SYSTEM,
                title="New Resource Listed",
                message=f"{owner_name} listed a new resource: '{resource_title}'. Check it out!",
                link=f"/resources/{resource_id}",
            )
    finally:
        db.close()

