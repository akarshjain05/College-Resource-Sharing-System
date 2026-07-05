"""
Application configuration loaded from environment variables (.env).
Uses pydantic-settings so every value is validated at startup.
"""
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    # ---- General ----
    PROJECT_NAME: str = "Campus Resource Sharing System"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # ---- Database ----
    DATABASE_URL: str = "postgresql://crss_user:crss_password@db:5432/crss_db"

    # ---- Redis ----
    REDIS_URL: str = "redis://redis:6379/0"

    # ---- JWT ----
    SECRET_KEY: str = "change-this-super-secret-key-in-production-please"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
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


settings = Settings()
