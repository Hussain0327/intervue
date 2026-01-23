import base64
import io
import tempfile
from pathlib import Path


def decode_base64_audio(audio_data: str) -> bytes:
    """Decode base64 encoded audio data."""
    # Handle data URL format
    if "," in audio_data:
        audio_data = audio_data.split(",")[1]
    return base64.b64decode(audio_data)


def encode_audio_to_base64(audio_bytes: bytes) -> str:
    """Encode audio bytes to base64 string."""
    return base64.b64encode(audio_bytes).decode("utf-8")


def save_audio_to_temp_file(audio_bytes: bytes, suffix: str = ".webm") -> Path:
    """Save audio bytes to a temporary file and return the path."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
        f.write(audio_bytes)
        return Path(f.name)


def create_audio_file_like(audio_bytes: bytes, filename: str = "audio.webm") -> tuple[str, io.BytesIO, str]:
    """Create a file-like tuple for OpenAI API uploads.

    Returns (filename, file_obj, content_type) tuple.
    """
    file_obj = io.BytesIO(audio_bytes)

    # Determine content type based on extension
    ext = filename.split(".")[-1].lower()
    content_types = {
        "webm": "audio/webm",
        "mp3": "audio/mpeg",
        "wav": "audio/wav",
        "m4a": "audio/m4a",
        "ogg": "audio/ogg",
    }
    content_type = content_types.get(ext, "audio/webm")

    return (filename, file_obj, content_type)
