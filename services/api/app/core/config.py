import logging
import warnings
from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

# Find the project root (where .env is located)
PROJECT_ROOT = Path(__file__).resolve().parents[4]  # services/api/app/core -> root

_DEV_DATABASE_URL = "postgresql+asyncpg://intervue:intervue_dev@localhost:5432/intervue"
_DEV_REDIS_URL = "redis://localhost:6379"


class Settings(BaseSettings):
    # API Keys - validated to ensure they're set
    openai_api_key: str = Field(default="", min_length=0)
    anthropic_api_key: str = Field(default="", min_length=0)

    # Database
    database_url: str = ""

    # Redis
    redis_url: str = ""

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

    # Authentication
    jwt_secret: str = Field(default="")
    jwt_algorithm: str = "HS256"
    jwt_audience: str = "intervue-api"
    jwt_issuer: str = "intervue"

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

    # Streaming Pipeline Settings
    streaming_enabled: bool = True
    stt_provider: str = "deepgram"  # "deepgram" or "whisper"
    tts_provider: str = "elevenlabs"  # "elevenlabs" or "openai"

    # Deepgram Settings
    deepgram_api_key: str = Field(default="")
    deepgram_model: str = "nova-3"

    # ElevenLabs Settings
    elevenlabs_api_key: str = Field(default="")
    elevenlabs_voice_id: str = "21m00Tcm4TlvDq8ikWAM"  # Rachel voice
    elevenlabs_model_id: str = "eleven_turbo_v2_5"

    # Streaming Buffer Settings
    streaming_sentence_min_chars: int = 20

    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",  # Ignore frontend env vars like NEXT_PUBLIC_*
    )

    @model_validator(mode="after")
    def _validate_settings(self) -> "Settings":
        if not self.database_url:
            warnings.warn(
                "DATABASE_URL not set — falling back to dev default. "
                "Do NOT use this in production.",
                stacklevel=2,
            )
            self.database_url = _DEV_DATABASE_URL

        # Render provides postgresql:// but asyncpg requires postgresql+asyncpg://
        if self.database_url.startswith("postgresql://"):
            self.database_url = self.database_url.replace(
                "postgresql://", "postgresql+asyncpg://", 1
            )

        if not self.redis_url:
            warnings.warn(
                "REDIS_URL not set — falling back to dev default. "
                "Do NOT use this in production.",
                stacklevel=2,
            )
            self.redis_url = _DEV_REDIS_URL

        if not self.jwt_secret:
            warnings.warn(
                "JWT_SECRET not set — authentication will reject all tokens. "
                "Set this to a strong random secret in production.",
                stacklevel=2,
            )

        api_keys = (
            "openai_api_key",
            "anthropic_api_key",
            "deepgram_api_key",
            "elevenlabs_api_key",
        )
        for key_name in api_keys:
            if not getattr(self, key_name):
                logger.warning(
                    "%s is not set — related features will fail at runtime",
                    key_name.upper(),
                )

        return self

    def get_cors_origins(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


_settings: Settings | None = None


def get_settings() -> Settings:
    """Get cached settings singleton."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
