from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Find the project root (where .env is located)
PROJECT_ROOT = Path(__file__).resolve().parents[4]  # services/api/app/core -> root


class Settings(BaseSettings):
    # API Keys
    openai_api_key: str = ""
    anthropic_api_key: str = ""

    # Database
    database_url: str = "postgresql+asyncpg://intervue:intervue_dev@localhost:5432/intervue"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

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


def get_settings() -> Settings:
    """Get settings (reloads from .env each time in debug mode)."""
    return Settings()
