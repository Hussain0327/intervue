import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.core.redis import close_redis, init_redis


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    await init_redis()
    yield
    await close_redis()


app = FastAPI(
    title="Intervue API",
    description="Resume-aware AI behavioral interview platform",
    version="0.1.0",
    lifespan=lifespan,
)

# SessionMiddleware is required for OAuth state parameter
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from app.routers import auth, resumes, sessions  # noqa: E402

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(resumes.router, prefix="/api/resumes", tags=["resumes"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])

# WS router has no prefix (uses /ws/...)
from app.routers import interview_ws  # noqa: E402

app.include_router(interview_ws.router, tags=["interview"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
