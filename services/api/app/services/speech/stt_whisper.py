import io
import time
from dataclasses import dataclass

from openai import AsyncOpenAI

from app.core.config import get_settings
from app.services.speech.audio_utils import decode_base64_audio

settings = get_settings()


@dataclass
class STTResult:
    """Result from speech-to-text transcription."""

    text: str
    latency_ms: int


class WhisperSTT:
    """OpenAI Whisper speech-to-text client."""

    def __init__(self) -> None:
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.stt_model

    async def transcribe(
        self,
        audio_data: str | bytes,
        language: str = "en",
    ) -> STTResult:
        """Transcribe audio to text using Whisper API.

        Args:
            audio_data: Base64 encoded audio or raw bytes
            language: Language code (default: "en")

        Returns:
            STTResult with transcribed text and latency
        """
        start_time = time.perf_counter()

        # Convert base64 to bytes if needed
        if isinstance(audio_data, str):
            audio_bytes = decode_base64_audio(audio_data)
        else:
            audio_bytes = audio_data

        # Create file-like object for API
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = "audio.webm"

        # Call Whisper API
        response = await self.client.audio.transcriptions.create(
            model=self.model,
            file=audio_file,
            language=language,
            response_format="text",
        )

        latency_ms = int((time.perf_counter() - start_time) * 1000)

        return STTResult(
            text=response.strip(),
            latency_ms=latency_ms,
        )


# Singleton instance
_stt_client: WhisperSTT | None = None


def get_stt_client() -> WhisperSTT:
    """Get or create the STT client singleton."""
    global _stt_client
    if _stt_client is None:
        _stt_client = WhisperSTT()
    return _stt_client
