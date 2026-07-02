"""
Async email sending via SMTP (aiosmtplib). Called from BackgroundTasks in routers
so requests don't block on network I/O to the mail server.
"""
import logging

from email.message import EmailMessage

import aiosmtplib

from app.core.config import settings

logger = logging.getLogger("crss")


def _build_message(to_email: str, subject: str, html_body: str) -> EmailMessage:
    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content("This email requires an HTML-capable client to view.")
    message.add_alternative(html_body, subtype="html")
    return message


async def send_email(to_email: str, subject: str, html_body: str) -> None:
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.info("SMTP not configured; skipping email to %s (subject: %s)", to_email, subject)
        return

    message = _build_message(to_email, subject, html_body)
    try:
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=settings.SMTP_TLS,
        )
    except Exception:
        logger.exception("Failed to send email to %s", to_email)


def _wrap_template(title: str, body_html: str) -> str:
    return f"""
    <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color:#1F4B3F;">{title}</h2>
      <div style="color:#101828; font-size: 14px; line-height: 1.6;">{body_html}</div>
      <p style="margin-top: 32px; font-size: 12px; color: #9AA2B2;">
        Campus Resource Sharing System — this is an automated message.
      </p>
    </div>
    """


async def send_verification_email(to_email: str, full_name: str, verify_link: str) -> None:
    html = _wrap_template(
        "Verify your campus account",
        f"Hi {full_name},<br><br>Welcome to CRSS. Please confirm your email to start borrowing "
        f"and lending resources on campus.<br><br>"
        f'<a href="{verify_link}" style="background:#1F4B3F;color:#fff;padding:10px 16px;'
        f'border-radius:6px;text-decoration:none;">Verify my email</a>',
    )
    await send_email(to_email, "Verify your CRSS account", html)


async def send_password_reset_email(to_email: str, full_name: str, reset_link: str) -> None:
    html = _wrap_template(
        "Reset your password",
        f"Hi {full_name},<br><br>We received a request to reset your password. "
        f"If this wasn't you, you can ignore this email.<br><br>"
        f'<a href="{reset_link}" style="background:#C08A2E;color:#fff;padding:10px 16px;'
        f'border-radius:6px;text-decoration:none;">Reset password</a>',
    )
    await send_email(to_email, "Reset your CRSS password", html)


async def send_borrow_request_email(to_email: str, owner_name: str, borrower_name: str, resource_title: str) -> None:
    html = _wrap_template(
        "New borrow request",
        f"Hi {owner_name},<br><br>{borrower_name} has requested to borrow "
        f"<strong>{resource_title}</strong>. Log in to approve or reject the request.",
    )
    await send_email(to_email, f"New borrow request for {resource_title}", html)


async def send_return_reminder_email(to_email: str, borrower_name: str, resource_title: str, due_date: str) -> None:
    html = _wrap_template(
        "Return reminder",
        f"Hi {borrower_name},<br><br><strong>{resource_title}</strong> is due back on "
        f"<strong>{due_date}</strong>. Please return it on time to keep your trust score high.",
    )
    await send_email(to_email, f"Reminder: return {resource_title} soon", html)
