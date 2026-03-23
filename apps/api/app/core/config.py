from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    APP_NAME: str = "Revio API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "sqlite:///./dev.db"

    # AI Memory (ChromaDB)
    MEMORY_DB_PATH: str = ".data/chromadb"

    # Admin Auth
    ADMIN_EMAIL: str = "admin@revio.com"
    ADMIN_PASSWORD: str = "changeme"
    SECRET_KEY: str = "changeme-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 1440

    # Gemini AI
    GEMINI_API_KEY: str = ""

    # Resume Storage
    RESUME_STORAGE_PATH: str = ".data/resumes"

    # LiveKit
    LIVEKIT_URL: str = ""
    LIVEKIT_API_KEY: str = ""
    LIVEKIT_API_SECRET: str = ""

    # CORS — accepts JSON list or comma-separated string
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_JSON: bool = False  # Set True in production for structured JSON logs

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def fix_database_url(cls, v: str) -> str:
        # Railway Postgres uses postgresql:// but SQLAlchemy needs postgresql+psycopg2://
        if v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+psycopg2://", 1)
        return v

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


settings = Settings()
