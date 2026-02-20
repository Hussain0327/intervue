import io

from app.services.llm import openai_client


async def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/webm") -> str:
    ext = "webm" if "webm" in mime_type else "mp3"

    transcript = await openai_client.audio.transcriptions.create(
        model="whisper-1",
        file=(f"audio.{ext}", io.BytesIO(audio_bytes), mime_type),
        response_format="text",
    )

    return transcript.strip()
