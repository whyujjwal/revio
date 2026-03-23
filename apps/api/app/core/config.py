import json
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "Revio API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    PORT: int = 8000

    DATABASE_URL: str = "sqlite:///./dev.db"

    MEMORY_DB_PATH: str = ".data/chromadb"

    ADMIN_EMAIL: str = "admin@revio.com"
    ADMIN_PASSWORD: str = "changeme"
    SECRET_KEY: str = "changeme-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 1440

    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

    RESUME_STORAGE_PATH: str = ".data/resumes"

    LIVEKIT_URL: str = ""
    LIVEKIT_API_KEY: str = ""
    LIVEKIT_API_SECRET: str = ""

    CORS_ORIGINS: Annotated[list[str], NoDecode] = ["http://localhost:3000"]

    LOG_LEVEL: str = "INFO"
    LOG_JSON: bool = False

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def fix_database_url(cls, v: str) -> str:
        if v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+psycopg2://", 1)
        return v

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                try:
                    return json.loads(v)
                except json.JSONDecodeError:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


settings = Settings()
