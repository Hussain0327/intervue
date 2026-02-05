"""Shared test fixtures for the Intervue API test suite."""

from __future__ import annotations

import os
import uuid
import warnings

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.compiler import compiles

# Must set env vars BEFORE anything imports Settings
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-jwt-signing-only")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite://")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")

# Suppress expected warnings during test collection
warnings.filterwarnings("ignore", message=".*DATABASE_URL not set.*")
warnings.filterwarnings("ignore", message=".*REDIS_URL not set.*")
warnings.filterwarnings("ignore", message=".*JWT_SECRET not set.*")
warnings.filterwarnings("ignore", message=".*is not set.*")

from app.core.security import create_access_token, create_refresh_token  # noqa: E402
from app.db.base import Base  # noqa: E402


# Register SQLite-compatible type compilers for PG-specific types
@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"


@compiles(PG_UUID, "sqlite")
def _compile_pg_uuid_sqlite(type_, compiler, **kw):
    return "VARCHAR(36)"


# ---------------------------------------------------------------------------
# Environment fixture (session-scoped, autouse)
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session", autouse=True)
def test_env():
    """Ensure env vars are set before Settings is ever instantiated."""
    os.environ["JWT_SECRET"] = "test-secret-key-for-jwt-signing-only"
    os.environ["DATABASE_URL"] = "sqlite+aiosqlite://"
    os.environ["REDIS_URL"] = "redis://localhost:6379"

    # Reset cached settings singleton so tests get fresh config
    import app.core.config as cfg

    cfg._settings = None
    yield
    cfg._settings = None


@pytest.fixture(scope="session")
def anyio_backend():
    """Use asyncio as the async backend for tests."""
    return "asyncio"


# ---------------------------------------------------------------------------
# Database engine and session fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
async def db_engine():
    """Create an async SQLite engine and all tables for a test run."""
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        echo=False,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def db_session(db_engine):
    """Provide an async DB session that rolls back after each test."""
    session_factory = async_sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    async with session_factory() as session:
        yield session
        await session.rollback()


# ---------------------------------------------------------------------------
# Application client with DB override
# ---------------------------------------------------------------------------


@pytest.fixture
async def app_client(db_engine):
    """AsyncClient with ASGITransport, overriding get_db dependency."""
    from app.db.session import get_db
    from app.main import app

    session_factory = async_sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

    async def _override_get_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = _override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.pop(get_db, None)


# ---------------------------------------------------------------------------
# Auth token fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def test_user_id() -> str:
    """A consistent test user UUID."""
    return str(uuid.uuid4())


@pytest.fixture
def test_user_tokens(test_user_id: str) -> dict[str, str]:
    """Generate valid JWT access + refresh tokens for the test user."""
    access = create_access_token(test_user_id, "test@example.com")
    refresh = create_refresh_token(test_user_id)
    return {"access_token": access, "refresh_token": refresh, "user_id": test_user_id}


@pytest.fixture
def auth_headers(test_user_tokens: dict[str, str]) -> dict[str, str]:
    """Authorization headers with a valid Bearer token."""
    return {"Authorization": f"Bearer {test_user_tokens['access_token']}"}
