from pydantic import field_validator
from pydantic_settings import BaseSettings

_DEFAULT_SECRET = "dev-secret-key-change-in-production"


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://intervue:intervue@localhost:5432/intervue"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # OpenAI
    OPENAI_API_KEY: str = ""

    # OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""

    # App
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    SECRET_KEY: str = _DEFAULT_SECRET
    BACKEND_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:5173"

    # File uploads
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    # Interview defaults
    DEFAULT_VOICE: str = "nova"
    DEFAULT_TARGET_QUESTIONS: int = 4

    # Redis TTLs
    RESUME_CACHE_TTL: int = 86400  # 24 hours
    SESSION_STATE_TTL: int = 7200  # 2 hours

    # Database pool
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800

    model_config = {"env_file": ".env", "extra": "ignore"}

    @field_validator("SECRET_KEY")
    @classmethod
    def _validate_secret_key(cls, v: str, info) -> str:
        env = info.data.get("ENVIRONMENT", "development")
        if env == "production" and v == _DEFAULT_SECRET:
            raise ValueError(
                "SECRET_KEY must be changed from the default value in production"
            )
        if env == "production" and len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters in production")
        return v


settings = Settings()
