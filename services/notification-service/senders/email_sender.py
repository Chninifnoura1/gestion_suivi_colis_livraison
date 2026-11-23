import logging
import smtplib
from email.message import EmailMessage

logger = logging.getLogger(__name__)


class EmailSender:
    def __init__(self, config):
        self.config = config

    def send(self, recipient, subject, body):
        if self.config["NOTIFICATION_MODE"] == "mock":
            logger.info("Mock email to %s | %s | %s", recipient, subject, body)
            return
        if self.config["NOTIFICATION_MODE"] != "real":
            raise ValueError("NOTIFICATION_MODE doit être 'mock' ou 'real'")
        required = ("SMTP_HOST", "SMTP_FROM")
        if not all(self.config.get(key) for key in required):
            raise ValueError("SMTP_HOST et SMTP_FROM sont requis en mode real")

        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = self.config["SMTP_FROM"]
        message["To"] = recipient
        message.set_content(body)

        with smtplib.SMTP(self.config["SMTP_HOST"], self.config["SMTP_PORT"], timeout=20) as smtp:
            smtp.starttls()
            if self.config.get("SMTP_USER"):
                smtp.login(self.config["SMTP_USER"], self.config.get("SMTP_PASSWORD", ""))
            smtp.send_message(message)
