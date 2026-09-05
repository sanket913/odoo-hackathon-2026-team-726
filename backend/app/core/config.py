"""
Application configuration loaded from environment variables (.env).
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "PeoplePay360"
    ENV: str = "development"
    # Attendance Geofence / local business time
    BUSINESS_TIMEZONE: str = "Asia/Kolkata"
    OFFICE_LAT: float = 26.47
    OFFICE_LON: float = 73.11
    OFFICE_RADIUS_KM: float = 0.2
    # Database
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "pp360"
    DB_PASSWORD: str = "pp360_dev_pw"
    DB_NAME: str = "peoplepay360"

    @property
    def DATABASE_URL(self) -> str:
        # Allow full override via env var (used by tests to point at sqlite/mysql test db)
        override = os.getenv("DATABASE_URL")
        if override:
            return override
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"
        )

    # Security / JWT
    JWT_SECRET_KEY: str = "CHANGE_ME_dev_secret_key_do_not_use_in_prod"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173"

    # SMTP (optional - if not fully configured, emails are not sent)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "no-reply@peoplepay360.local"
    SMTP_USE_TLS: bool = True

    @property
    def smtp_configured(self) -> bool:
        return bool(self.SMTP_HOST and self.SMTP_USER and self.SMTP_PASSWORD)

    @property
    def cors_origins_list(self):
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
