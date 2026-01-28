from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Find the project root (where .env is located)
PROJECT_ROOT = Path(__file__).resolve().parents[4]  # services/api/app/core -> root


class Settings(BaseSettings):
    # API Keys - validated to ensure they're set
    openai_api_key: str = Field(default="", min_length=0)
    anthropic_api_key: str = Field(default="", min_length=0)

    # Database
    database_url: str = "postgresql+asyncpg://intervue:intervue_dev@localhost:5432/intervue"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False  # Default to False for production safety

    # CORS - comma-separated list of allowed origins
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # API Timeouts (in seconds)
    api_timeout: float = 30.0
    llm_timeout: float = 60.0  # LLM calls can take longer
    tts_timeout: float = 30.0
    stt_timeout: float = 30.0

    # Rate Limiting
    rate_limit_per_minute: int = 60

    # TTS/STT Settings
    tts_model: str = "tts-1"
    tts_voice: str = "alloy"
    stt_model: str = "whisper-1"

    # LLM Settings
    llm_provider: str = "anthropic"  # anthropic or openai
    llm_model: str = "claude-sonnet-4-20250514"
    llm_max_tokens: int = 1024
    llm_temperature: float = 0.7

    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",  # Ignore frontend env vars like NEXT_PUBLIC_*
    )

    def get_cors_origins(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


def get_settings() -> Settings:
    """Get settings (reloads from .env each time in debug mode)."""
    return Settings()
