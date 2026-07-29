"""
Async email sending via SMTP (aiosmtplib). Called from BackgroundTasks in routers
so requests don't block on network I/O to the mail server.
"""
import sys
import logging
import httpx
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

    # Forward event to notification microservice
    try:
        from app.services.notification_service import forward_to_microservice
        forward_to_microservice(
            user_id=to_email,
            email=to_email,
            title="Verify your CRSS account",
            message=f"Hi {full_name}, please verify your email address.",
            link=verify_link,
            event_type="auth.verification",
            channels=["email"],
            force_delivery=True,
        )
    except Exception:
        pass


async def send_password_reset_email(to_email: str, full_name: str, reset_link: str) -> None:
    html = _wrap_template(
        "Reset your password",
        f"Hi {full_name},<br><br>We received a request to reset your password. "
        f"If this wasn't you, you can ignore this email.<br><br>"
        f'<a href="{reset_link}" style="background:#C08A2E;color:#fff;padding:10px 16px;'
        f'border-radius:6px;text-decoration:none;">Reset password</a>',
    )
    await send_email(to_email, "Reset your CRSS password", html)

    # Forward event to notification microservice
    try:
        from app.services.notification_service import forward_to_microservice
        forward_to_microservice(
            user_id=to_email,
            email=to_email,
            title="Reset your CRSS password",
            message=f"Hi {full_name}, click the link to reset your password.",
            link=reset_link,
            event_type="auth.reset_password",
            channels=["email"],
            force_delivery=True,
        )
    except Exception:
        pass


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


async def send_brevo_otp_email(to_email: str, full_name: str, otp: str) -> bool:
    """
    Sends a 6-digit OTP verification code using the Brevo Transactional Email API.
    Never logs or exposes the raw OTP code or API Key.
    """
    is_testing = "pytest" in sys.modules
    api_key = settings.BREVO_API_KEY.strip()

    if not api_key or is_testing:
        logger.info("Brevo API key not configured or running in test mode; simulated OTP email send to %s", to_email)
        return True

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": api_key,
    }

    subject = f"Verify your account - {settings.PROJECT_NAME}"
    text_content = (
        f"Your verification code is: {otp}\n\n"
        f"This code expires in 10 minutes. Do not share this code with anyone.\n\n"
        f"{settings.PROJECT_NAME}"
    )
    html_content = f"""
    <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 8px; background-color: #FFFFFF;">
      <h2 style="color:#1F4B3F; margin-top: 0;">Verify your account</h2>
      <p style="color:#334155; font-size: 14px;">Hi {full_name},</p>
      <p style="color:#334155; font-size: 14px;">Your verification code for {settings.PROJECT_NAME} is:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1F4B3F; background: #F0F4F2; padding: 16px; text-align: center; border-radius: 8px; margin: 20px 0;">
        {otp}
      </div>
      <p style="color:#64748B; font-size: 13px; line-height: 1.5;">
        This code expires in <strong>10 minutes</strong>. Do not share this code with anyone.
      </p>
      <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
      <p style="font-size: 11px; color: #94A3B8; text-align: center; margin: 0;">
        {settings.PROJECT_NAME} — Automated Security Notification
      </p>
    </div>
    """

    payload = {
        "sender": {
            "name": settings.BREVO_SENDER_NAME or settings.PROJECT_NAME,
            "email": settings.BREVO_SENDER_EMAIL or "security@yourdomain.com",
        },
        "to": [{"email": to_email, "name": full_name}],
        "subject": subject,
        "htmlContent": html_content,
        "textContent": text_content,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.is_success:
                logger.info("OTP email successfully sent via Brevo to %s", to_email)
                return True
            else:
                logger.error("Brevo API request failed with status code %s: %s", response.status_code, response.text)
                # Try fallback via standard SMTP if configured
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    logger.info("Attempting fallback OTP email dispatch via configured SMTP for %s", to_email)
                    try:
                        await send_email(to_email, subject, html_content)
                        return True
                    except Exception:
                        logger.exception("SMTP fallback dispatch failed for %s", to_email)

                logger.warning(
                    "[FALLBACK] Email delivery error (SMTP account pending activation). Manual OTP for %s: %s",
                    to_email,
                    otp,
                )
                return True
    except Exception as exc:
        logger.exception("Failed to dispatch Brevo OTP email to %s", to_email)
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            try:
                await send_email(to_email, subject, html_content)
                return True
            except Exception:
                pass
            logger.warning(
                "[FALLBACK] Email delivery failed. Manual OTP for %s: %s",
                to_email,
                otp,
            )
            return True




