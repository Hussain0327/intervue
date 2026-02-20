import hashlib
import json

import redis.asyncio as redis

from app.core.config import settings

redis_client: redis.Redis | None = None


async def init_redis() -> redis.Redis:
    global redis_client
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return redis_client


async def close_redis() -> None:
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None


def get_redis() -> redis.Redis:
    if redis_client is None:
        raise RuntimeError("Redis not initialized")
    return redis_client


# Resume cache helpers
def _resume_cache_key(file_content_hash: str) -> str:
    return f"resume:parsed:{file_content_hash}"


def compute_file_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


async def get_cached_resume(file_hash: str) -> dict | None:
    r = get_redis()
    data = await r.get(_resume_cache_key(file_hash))
    if data:
        return json.loads(data)
    return None


async def cache_resume(file_hash: str, structured_data: dict) -> None:
    r = get_redis()
    await r.set(
        _resume_cache_key(file_hash),
        json.dumps(structured_data),
        ex=settings.RESUME_CACHE_TTL,
    )


# Session state helpers
def _session_state_key(session_id: str) -> str:
    return f"interview:session:{session_id}"


async def get_session_state(session_id: str) -> dict | None:
    r = get_redis()
    data = await r.get(_session_state_key(session_id))
    if data:
        return json.loads(data)
    return None


async def save_session_state(session_id: str, state: dict) -> None:
    r = get_redis()
    await r.set(
        _session_state_key(session_id),
        json.dumps(state),
        ex=settings.SESSION_STATE_TTL,
    )


async def delete_session_state(session_id: str) -> None:
    r = get_redis()
    await r.delete(_session_state_key(session_id))
