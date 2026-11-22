import smtplib
from email.message import EmailMessage
from app.config import settings

def send_verification_email(recipient: str, token: str) -> None:
    required = (settings.smtp_host, settings.smtp_username, settings.smtp_password, settings.smtp_from_email)
    if not all(required):
        raise RuntimeError("SMTP email delivery is not configured")
    message = EmailMessage()
    message["Subject"] = "Verify your Arox Store account"
    message["From"] = settings.smtp_from_email
    message["To"] = recipient
    message.set_content(
        f"Verify your Arox Store account using this link:\n\n{settings.frontend_url}?verify={token}\n\n"
        "If you did not create this account, ignore this email."
    )
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
        server.starttls()
        server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(message)
