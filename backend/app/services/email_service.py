"""
Async email sending via SMTP (aiosmtplib). Called from BackgroundTasks in routers
so requests don't block on network I/O to the mail server.
"""
import sys
import logging
import httpx
import html
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


def _wrap_template(title: str, body_html: str, subtitle: str = "Automated Security & Transaction Notification") -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #E2E8F0; box-shadow: 0 10px 30px -5px rgba(0,0,0,0.05); overflow: hidden;">
          
          <!-- Top Header Bar -->
          <tr>
            <td style="background: linear-gradient(135deg, #1F4B3F 0%, #0D2820 100%); padding: 32px 28px; text-align: center;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background: rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 8px 16px; margin-bottom: 12px;">
                      <span style="color: #FFFFFF; font-weight: 800; font-size: 16px; letter-spacing: 0.5px;">🤝 ShareNeighbour</span>
                    </div>
                    <h1 style="color: #FFFFFF; margin: 0; font-size: 22px; font-weight: 700; line-height: 1.3;">{title}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 36px 32px; color: #334155; font-size: 14px; line-height: 1.6;">
              {body_html}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 24px 32px; border-top: 1px solid #F1F5F9; text-align: center;">
              <p style="margin: 0; font-weight: 700; color: #475569; font-size: 13px;">{settings.PROJECT_NAME}</p>
              <p style="margin: 4px 0 0 0; color: #94A3B8; font-size: 11px;">{subtitle}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


async def send_verification_email(to_email: str, full_name: str, verify_link: str) -> None:
    safe_name = html.escape(full_name)
    body = f"""
      <p style="margin-top:0; color:#1E293B; font-size:15px; font-weight:600;">Hi {safe_name},</p>
      <p style="color:#475569;">Welcome to {settings.PROJECT_NAME}! Please verify your email address to start sharing and borrowing items on campus.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{verify_link}" style="background-color: #1F4B3F; color: #FFFFFF; padding: 14px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px; box-shadow: 0 4px 12px rgba(31,75,63,0.25);">Verify My Account</a>
      </div>
      <p style="color: #94A3B8; font-size: 12px; margin-top: 24px;">If the button above does not work, copy and paste this link into your browser:<br><span style="color: #64748B; word-break: break-all;">{verify_link}</span></p>
    """
    html = _wrap_template("Verify Your Campus Account", body, "Official Account Verification")
    await send_email(to_email, "Verify your CRSS account", html)

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
    safe_name = html.escape(full_name)
    body = f"""
      <p style="margin-top:0; color:#1E293B; font-size:15px; font-weight:600;">Hi {safe_name},</p>
      <p style="color:#475569;">We received a request to reset your password. If this wasn't you, you can safely ignore this email.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{reset_link}" style="background-color: #1F4B3F; color: #FFFFFF; padding: 14px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px; box-shadow: 0 4px 12px rgba(31,75,63,0.25);">Reset Password</a>
      </div>
      <p style="color: #94A3B8; font-size: 12px; margin-top: 24px;">If the button above does not work, copy and paste this link into your browser:<br><span style="color: #64748B; word-break: break-all;">{reset_link}</span></p>
    """
    html = _wrap_template("Reset Your Password", body, "Security Account Recovery")

    api_key = settings.BREVO_API_KEY.strip() if settings.BREVO_API_KEY else None
    if api_key and not ("pytest" in sys.modules):
        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": api_key,
        }
        payload = {
            "sender": {
                "name": settings.BREVO_SENDER_NAME or settings.PROJECT_NAME,
                "email": settings.BREVO_SENDER_EMAIL or "security@yourdomain.com",
            },
            "to": [{"email": to_email, "name": full_name}],
            "subject": "Reset your CRSS password",
            "htmlContent": html,
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                if response.is_success:
                    logger.info("Password reset email sent via Brevo to %s", to_email)
                else:
                    logger.error("Brevo API request failed: %s", response.text)
                    await send_email(to_email, "Reset your CRSS password", html)
        except Exception:
            logger.exception("Failed to dispatch Brevo reset email")
            await send_email(to_email, "Reset your CRSS password", html)
    else:
        await send_email(to_email, "Reset your CRSS password", html)

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



async def send_payment_refund_email(to_email: str, user_name: str, amount: float, item_title: str, transaction_id: str) -> None:
    safe_name = html.escape(user_name)
    safe_title = html.escape(item_title)
    safe_tx = html.escape(transaction_id)
    body = f"""
      <p style="margin-top:0; color:#1E293B; font-size:15px; font-weight:600;">Hi {safe_name},</p>
      <p style="color:#475569;">Your security deposit of <strong>₹{amount:.2f}</strong> for <strong>{safe_title}</strong> has been released and refunded.</p>

      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 20px; margin: 24px 0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="color: #64748B; font-size: 13px; padding-bottom: 8px;">Item:</td>
            <td align="right" style="color: #0F172A; font-size: 13px; font-weight: 700; padding-bottom: 8px;">{safe_title}</td>
          </tr>
          <tr>
            <td style="color: #64748B; font-size: 13px; padding-bottom: 8px;">Refund Amount:</td>
            <td align="right" style="color: #2563EB; font-size: 16px; font-weight: 800; padding-bottom: 8px;">₹{amount:.2f}</td>
          </tr>
          <tr>
            <td style="color: #64748B; font-size: 13px; padding-bottom: 8px;">Transaction ID:</td>
            <td align="right" style="color: #0F172A; font-size: 12px; font-family: monospace; padding-bottom: 8px;">{safe_tx}</td>
          </tr>
          <tr>
            <td style="color: #64748B; font-size: 13px;">Status:</td>
            <td align="right">
              <span style="background: #DBEAFE; color: #1E40AF; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase;">REFUNDED</span>
            </td>
          </tr>
        </table>
      </div>
    """
    html = _wrap_template("Payment Refund — Deposit Released", body, "Official Refund Notice")
    await send_email(to_email, f"Deposit Released: ₹{amount:.2f} for {item_title}", html)


async def send_payment_confirmation_email(to_email: str, full_name: str, resource_title: str, amount: float) -> None:
    safe_name = html.escape(full_name)
    safe_title = html.escape(resource_title)
    body = f"""
      <p style="margin-top:0; color:#1E293B; font-size:15px; font-weight:600;">Hi {safe_name},</p>
      <p style="color:#475569;">Your payment has been received successfully.</p>

      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 20px; margin: 24px 0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="color: #64748B; font-size: 13px; padding-bottom: 8px;">Item:</td>
            <td align="right" style="color: #0F172A; font-size: 13px; font-weight: 700; padding-bottom: 8px;">{safe_title}</td>
          </tr>
          <tr>
            <td style="color: #64748B; font-size: 13px; padding-bottom: 8px;">Amount Paid:</td>
            <td align="right" style="color: #15803D; font-size: 16px; font-weight: 800; padding-bottom: 8px;">₹{amount:.2f}</td>
          </tr>
          <tr>
            <td style="color: #64748B; font-size: 13px;">Status:</td>
            <td align="right">
              <span style="background: #DCFCE7; color: #15803D; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase;">CONFIRMED</span>
            </td>
          </tr>
        </table>
      </div>
    """
    html = _wrap_template("Payment Confirmation", body, "Official Transaction Receipt")
    await send_email(to_email, f"Payment Receipt: ₹{amount:.2f} for {resource_title}", html)


async def send_borrow_request_email(to_email: str, owner_name: str, borrower_name: str, resource_title: str) -> None:
    """Note: Routine borrow requests use in-app / push notifications."""
    pass


async def send_return_reminder_email(to_email: str, borrower_name: str, resource_title: str, due_date: str) -> None:
    """Note: Routine return reminders use in-app / push notifications."""
    pass


async def send_brevo_otp_email(to_email: str, full_name: str, otp: str) -> bool:
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

    safe_name = html.escape(full_name)
    body = f"""
      <p style="margin-top:0; color:#1E293B; font-size:15px; font-weight:600;">Hi {safe_name},</p>
      <p style="color:#475569;">Welcome to {settings.PROJECT_NAME}. Use the verification code below to confirm your account:</p>
      <div style="text-align: center; margin: 28px 0;">
        <div style="display: inline-block; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #166534; background: #F0FDF4; border: 1.5px solid #BBF7D0; padding: 18px 32px; border-radius: 16px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
          {otp}
        </div>
      </div>
      <div style="background-color: #F8FAFC; border-left: 4px solid #10B981; padding: 14px 18px; border-radius: 0 12px 12px 0; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.5;">
          <strong>Security Notice:</strong> This code expires in <strong>10 minutes</strong>. Do not share this code with anyone.
        </p>
      </div>
    """
    html_content = _wrap_template("Account Verification Code", body, "Official Security Notification")

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
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    try:
                        await send_email(to_email, subject, html_content)
                        return True
                    except Exception:
                        pass
                return False
    except Exception:
        logger.exception("Failed to dispatch Brevo OTP email to %s", to_email)
        return False


async def send_complaint_update_email(
    to_email: str,
    full_name: str,
    subject_title: str,
    status: str,
    update_text: str,
) -> bool:
    safe_name = html.escape(full_name)
    safe_subject = html.escape(subject_title)
    safe_update = html.escape(update_text)
    
    subject = f"Complaint Update [{status.upper()}]: {subject_title}"
    body = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #2563eb;">Complaint Triage & Resolution Update</h2>
        <p>Hello <strong>{safe_name}</strong>,</p>
        <p>Your complaint <strong>"{safe_subject}"</strong> has been updated.</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 15px 0;">
            <p><strong>Status:</strong> {html.escape(status.upper())}</p>
            <p><strong>Details:</strong> {safe_update}</p>
        </div>
        <p>Log in to your account dashboard to view the full resolution & chat updates.</p>
    </div>
    """
    html = _wrap_template(f"Complaint Update: {status.upper()}", body)
    try:
        await send_email(to_email, subject, html)
        return True
    except Exception:
        logger.exception("Failed to send complaint update email to %s", to_email)
        return False





