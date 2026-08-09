"""
Application configuration loaded from environment variables (.env).
Uses pydantic-settings so every value is validated at startup.
"""
from typing import List, Union, Optional
from pydantic import AnyHttpUrl, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    # ---- General ----
    PROJECT_NAME: str = "Campus Resource Sharing System"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # ---- Frontend ----
    # Used to build absolute links (e.g. password reset) that get emailed out.
    # MUST be set to your real deployed domain in production .env, e.g.
    # FRONTEND_URL=https://13.48.123.128.sslip.io -- otherwise reset emails
    # will link to localhost and be useless to the recipient.
    FRONTEND_URL: str = "http://localhost:5173"

    # ---- Database ----
    DATABASE_URL: str

    # ---- Redis ----
    REDIS_URL: str = "redis://redis:6379/0"

    # ---- JWT ----
    SECRET_KEY: str = ""
    OLD_SECRET_KEY: Optional[str] = None
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ---- Google Sign-In ----
    # The OAuth 2.0 Client ID from Google Cloud Console (Credentials -> OAuth client ID
    # -> Web application). Used as the required "audience" when verifying ID tokens, so
    # tokens issued for a different app can't be replayed against this backend.
    GOOGLE_CLIENT_ID: str = ""

    # ---- CORS ----
    BACKEND_CORS_ORIGINS: Union[List[str], str] = ["http://localhost:5173", "http://localhost:3000"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]):
        if isinstance(v, str) and not v.startswith("["):
            return [origin.strip() for origin in v.split(",")]
        return v

    # ---- Email ----
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@crss.edu"
    SMTP_TLS: bool = True

    # ---- Uploads ----
    UPLOAD_DIR: str = "/app/uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    # ---- Rate limiting ----
    RATE_LIMIT_PER_MINUTE: int = 60

    # ---- Notification Microservice ----
    NOTIFICATION_SERVICE_URL: str = "https://notification-olgf.onrender.com"
    NOTIFICATION_SERVICE_API_KEY: str = "default-dev-key"

    # ---- Brevo & OTP ----
    BREVO_API_KEY: str = ""
    BREVO_SENDER_EMAIL: str = "security@yourdomain.com"
    BREVO_SENDER_NAME: str = "Campus Resources"
    OTP_SECRET: str = ""
    OTP_PEPPER: str = ""
    OTP_EXPIRY_SECONDS: int = 600
    OTP_MAX_ATTEMPTS: int = 5
    OTP_RESEND_COOLDOWN_SECONDS: int = 60


    # ---- Razorpay ----
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""
    RAZORPAY_CURRENCY: str = "INR"

    @model_validator(mode="after")
    def validate_secrets_in_prod(self) -> 'Settings':
        if self.ENVIRONMENT == "production":
            import secrets
            import logging
            logger = logging.getLogger("crss")
            
            if not self.SECRET_KEY:
                logger.warning("SECRET_KEY not set in production! Generating a random one. All sessions will be invalidated on restart.")
                self.SECRET_KEY = secrets.token_urlsafe(32)
                
            if not self.OTP_SECRET:
                logger.warning("OTP_SECRET not set in production! Generating a random one. OTPs will be invalidated on restart.")
                self.OTP_SECRET = secrets.token_urlsafe(32)

            if not self.RAZORPAY_KEY_ID or not self.RAZORPAY_KEY_SECRET:
                logger.warning("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not set. Payments will fail!")
                
            if not self.GOOGLE_CLIENT_ID:
                logger.warning("GOOGLE_CLIENT_ID is not set in production. Google Sign-In will fail!")
                
        return self

settings = Settings()


