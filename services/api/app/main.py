import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import text

from app.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan events."""
    # Startup
    logger.info("Starting Intervue API...")

    # Pre-initialize service clients so first request isn't slow
    try:
        from app.services.llm.client import get_llm_client
        get_llm_client()
        logger.info("LLM client initialized")
    except Exception:
        logger.warning("Failed to pre-initialize LLM client", exc_info=True)

    try:
        from app.services.speech.stt_whisper import get_stt_client
        get_stt_client()
        logger.info("STT client initialized")
    except Exception:
        logger.warning("Failed to pre-initialize STT client", exc_info=True)

    try:
        from app.services.speech.tts_client import get_tts_client
        get_tts_client()
        logger.info("TTS client initialized")
    except Exception:
        logger.warning("Failed to pre-initialize TTS client", exc_info=True)

    yield
    # Shutdown
    logger.info("Shutting down Intervue API...")


app = FastAPI(
    title="Intervue API",
    description="Voice-based interview platform API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,  # Disable docs in production
    redoc_url="/redoc" if settings.debug else None,
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware - load origins from environment
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)


# Import routers after app is created to avoid circular imports
from app.routers import resume, ws_interview


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/ready")
async def readiness_check() -> dict[str, str]:
    """Readiness check with actual service connectivity."""
    status = "ready"
    services: dict[str, str] = {}

    # Check database connectivity
    try:
        from sqlalchemy.ext.asyncio import create_async_engine
        engine = create_async_engine(settings.database_url, pool_pre_ping=True)
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        await engine.dispose()
        services["database"] = "ok"
    except Exception as e:
        logger.warning("Database readiness check failed: %s", e)
        services["database"] = "unavailable"
        status = "degraded"

    # Check Redis connectivity
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(settings.redis_url)
        await r.ping()
        await r.aclose()
        services["redis"] = "ok"
    except Exception as e:
        logger.warning("Redis readiness check failed: %s", e)
        services["redis"] = "unavailable"
        status = "degraded"

    return {"status": status, **services}


# Include routers
app.include_router(ws_interview.router, tags=["interview"])
app.include_router(resume.router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
