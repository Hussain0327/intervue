from collections.abc import AsyncGenerator

from app.services.llm import openai_client


async def stream_tts(
    text: str,
    voice: str = "nova",
    model: str = "tts-1",
    response_format: str = "opus",
) -> AsyncGenerator[bytes, None]:
    async with openai_client.audio.speech.with_streaming_response.create(
        model=model,
        voice=voice,
        input=text,
        response_format=response_format,
    ) as response:
        async for chunk in response.iter_bytes(chunk_size=4096):
            yield chunk
