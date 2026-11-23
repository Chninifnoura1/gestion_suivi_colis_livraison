import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    POSTGRES_DB = os.getenv("POSTGRES_DB", "suivi_colis")
    POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
    POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", "5432"))
    PORT = int(os.getenv("PORT", "5005"))
    SMTP_HOST = os.getenv("SMTP_HOST", "")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM = os.getenv("SMTP_FROM", "")
    NOTIFICATION_MODE = os.getenv("NOTIFICATION_MODE", "mock").lower()
    INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY")
    DB_CONNECT_RETRIES = int(os.getenv("DB_CONNECT_RETRIES", "10"))
    DB_RETRY_DELAY = float(os.getenv("DB_RETRY_DELAY", "2"))
