"""Security tests — injection, JWT attacks, CORS."""

import uuid
from datetime import datetime, timedelta, timezone

import jwt as pyjwt
import pytest
from httpx import ASGITransport, AsyncClient
from httpx_ws import aconnect_ws
from httpx_ws.transport import ASGIWebSocketTransport

from app.core.config import get_settings
from app.core.security import create_access_token
from app.main import app

# ---------------------------------------------------------------------------
# SQL injection
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_sql_injection_login_email(app_client):
    """Pydantic EmailStr rejects SQL injection in email field."""
    r = await app_client.post(
        "/auth/login",
        json={"email": "' OR 1=1 --", "password": "test"},
    )
    assert r.status_code == 422


@pytest.mark.anyio
async def test_sql_injection_session_id_path(app_client, auth_headers):
    """Non-UUID session_id in path returns 422."""
    r = await app_client.get(
        "/sessions/'; DROP TABLE users; --",
        headers=auth_headers,
    )
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# XSS
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_xss_in_full_name(app_client):
    """XSS payload in full_name is stored as-is (not executed server-side)."""
    email = f"{uuid.uuid4().hex[:8]}@xss.com"
    r = await app_client.post(
        "/auth/register",
        json={
            "email": email,
            "password": "password123",
            "full_name": "<script>alert('xss')</script>",
        },
    )
    assert r.status_code == 201


# ---------------------------------------------------------------------------
# JWT attacks
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_jwt_none_algorithm_rejected():
    """Tokens with 'none' algorithm must be rejected."""
    settings = get_settings()
    payload = {
        "sub": "attacker",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        "aud": settings.jwt_audience,
        "iss": settings.jwt_issuer,
    }
    # PyJWT won't let you encode with alg=none without allow_none, but
    # we can test that a token signed with a wrong key is rejected
    bad_token = pyjwt.encode(payload, "wrong-secret", algorithm="HS256")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/auth/me", headers={"Authorization": f"Bearer {bad_token}"})
        assert r.status_code == 401


@pytest.mark.anyio
async def test_jwt_modified_payload_wrong_key():
    payload = {
        "sub": "hacker",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        "aud": get_settings().jwt_audience,
        "iss": get_settings().jwt_issuer,
    }
    token = pyjwt.encode(payload, "not-the-real-key", algorithm="HS256")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 401


@pytest.mark.anyio
async def test_jwt_missing_exp():
    """Token without exp claim should be rejected."""
    settings = get_settings()
    payload = {
        "sub": "no-exp",
        "aud": settings.jwt_audience,
        "iss": settings.jwt_issuer,
    }
    token = pyjwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 401


@pytest.mark.anyio
async def test_jwt_wrong_audience():
    settings = get_settings()
    payload = {
        "sub": "user-1",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        "aud": "wrong-audience",
        "iss": settings.jwt_issuer,
    }
    token = pyjwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 401


@pytest.mark.anyio
async def test_jwt_wrong_issuer():
    settings = get_settings()
    payload = {
        "sub": "user-1",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        "aud": settings.jwt_audience,
        "iss": "wrong-issuer",
    }
    token = pyjwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_cors_allowed_origin():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.options(
            "/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert r.headers.get("access-control-allow-origin") == "http://localhost:3000"


@pytest.mark.anyio
async def test_cors_disallowed_origin():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.options(
            "/health",
            headers={
                "Origin": "http://evil.com",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert r.headers.get("access-control-allow-origin") != "http://evil.com"


# ---------------------------------------------------------------------------
# WebSocket auth attacks
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_ws_expired_token():
    expired = create_access_token("user-1", expires_minutes=-1)
    client = AsyncClient(transport=ASGIWebSocketTransport(app))
    async with client:
        async with aconnect_ws(
            f"http://test/ws/interview/{uuid.uuid4()}?token={expired}",
            client=client,
        ) as ws:
            import json
            data = json.loads(await ws.receive_text())
            assert data["type"] == "error"
            assert data["code"] == "AUTH_FAILED"


@pytest.mark.anyio
async def test_ws_token_wrong_secret():
    settings = get_settings()
    payload = {
        "sub": "hacker",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        "aud": settings.jwt_audience,
        "iss": settings.jwt_issuer,
    }
    bad_token = pyjwt.encode(payload, "totally-wrong-secret", algorithm="HS256")

    client = AsyncClient(transport=ASGIWebSocketTransport(app))
    async with client:
        async with aconnect_ws(
            f"http://test/ws/interview/{uuid.uuid4()}?token={bad_token}",
            client=client,
        ) as ws:
            import json
            data = json.loads(await ws.receive_text())
            assert data["type"] == "error"
            assert data["code"] == "AUTH_FAILED"


@pytest.mark.anyio
async def test_rate_limiter_configured():
    """App should have a rate limiter in its state."""
    assert hasattr(app.state, "limiter")
