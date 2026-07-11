"""
Celery app for background/scheduled jobs (return reminders, cleanup tasks).

Run the worker:
    celery -A app.tasks.celery_app worker --loglevel=info

Run the beat scheduler (for periodic reminders):
    celery -A app.tasks.celery_app beat --loglevel=info
"""
from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "crss",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.reminders"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

celery_app.conf.beat_schedule = {
    "send-return-reminders-daily": {
        "task": "app.tasks.reminders.send_return_reminders",
        "schedule": crontab(hour=8, minute=0),  # every day at 08:00 UTC
    },
    "mark-overdue-borrows-daily": {
        "task": "app.tasks.reminders.mark_overdue_borrows_late",
        "schedule": crontab(hour=0, minute=5),  # every day at 00:05 UTC
    },
}
