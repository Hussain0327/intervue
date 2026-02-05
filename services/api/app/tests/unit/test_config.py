"""Unit tests for app.core.config — Settings validation and parsing."""

import warnings

import app.core.config as cfg
from app.core.config import Settings, get_settings


def _fresh_settings(**overrides) -> Settings:
    """Create a Settings instance with overrides, bypassing .env file."""
    defaults = {
        "jwt_secret": "test-secret",
        "database_url": "sqlite+aiosqlite://",
        "redis_url": "redis://localhost:6379",
    }
    defaults.update(overrides)
    return Settings(**defaults)  # type: ignore[arg-type]


def test_defaults():
    s = _fresh_settings()
    assert s.host == "0.0.0.0"
    assert s.port == 8000
    assert s.jwt_algorithm == "HS256"
    assert s.jwt_audience == "intervue-api"
    assert s.jwt_issuer == "intervue"


def test_database_url_postgres_rewrite():
    s = _fresh_settings(database_url="postgresql://user:pw@host/db")
    assert s.database_url.startswith("postgresql+asyncpg://")


def test_database_url_asyncpg_left_alone():
    s = _fresh_settings(database_url="postgresql+asyncpg://user:pw@host/db")
    assert s.database_url == "postgresql+asyncpg://user:pw@host/db"


def test_cors_parsing_single():
    s = _fresh_settings(cors_origins="http://localhost:3000")
    assert s.get_cors_origins() == ["http://localhost:3000"]


def test_cors_parsing_multiple():
    s = _fresh_settings(cors_origins="http://a.com, http://b.com")
    assert s.get_cors_origins() == ["http://a.com", "http://b.com"]


def test_jwt_secret_warning():
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always")
        _fresh_settings(jwt_secret="")
        jwt_warnings = [x for x in w if "JWT_SECRET" in str(x.message)]
        assert len(jwt_warnings) >= 1


def test_singleton_caching():
    """get_settings() returns the same instance on repeated calls."""
    cfg._settings = None
    s1 = get_settings()
    s2 = get_settings()
    assert s1 is s2
    cfg._settings = None
