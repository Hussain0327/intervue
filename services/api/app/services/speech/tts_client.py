import time
from dataclasses import dataclass
from typing import Literal

import httpx
from openai import AsyncOpenAI

from app.core.config import get_settings
from app.services.speech.audio_utils import encode_audio_to_base64

settings = get_settings()

TTSVoice = Literal["alloy", "echo", "fable", "onyx", "nova", "shimmer"]


@dataclass
class TTSResult:
    """Result from text-to-speech synthesis."""

    audio_base64: str
    audio_bytes: bytes
    format: str
    latency_ms: int


class OpenAITTS:
    """OpenAI text-to-speech client."""

    def __init__(self) -> None:
        self.client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            timeout=httpx.Timeout(settings.tts_timeout, connect=10.0),
        )
        self.model = settings.tts_model
        self.default_voice: TTSVoice = settings.tts_voice  # type: ignore

    async def synthesize(
        self,
        text: str,
        voice: TTSVoice | None = None,
        response_format: Literal["mp3", "opus", "aac", "flac"] = "mp3",
        speed: float = 1.0,
    ) -> TTSResult:
        """Synthesize text to speech using OpenAI TTS API.

        Args:
            text: Text to synthesize
            voice: Voice to use (default: from settings)
            response_format: Audio format (default: mp3)
            speed: Playback speed 0.25-4.0 (default: 1.0)

        Returns:
            TTSResult with audio data and latency
        """
        start_time = time.perf_counter()

        voice = voice or self.default_voice

        # Call TTS API
        response = await self.client.audio.speech.create(
            model=self.model,
            voice=voice,
            input=text,
            response_format=response_format,
            speed=speed,
        )

        # Get audio bytes
        audio_bytes = response.content

        latency_ms = int((time.perf_counter() - start_time) * 1000)

        return TTSResult(
            audio_base64=encode_audio_to_base64(audio_bytes),
            audio_bytes=audio_bytes,
            format=response_format,
            latency_ms=latency_ms,
        )


# Singleton instance
_tts_client: OpenAITTS | None = None


def get_tts_client() -> OpenAITTS:
    """Get or create the TTS client singleton."""
    global _tts_client
    if _tts_client is None:
        _tts_client = OpenAITTS()
    return _tts_client
