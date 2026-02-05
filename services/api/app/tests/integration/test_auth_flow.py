"""Integration tests for the full auth lifecycle — register, login, refresh, me."""

import uuid

import pytest

from app.core.security import create_refresh_token

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _register(client, email="new@test.com", password="password123", full_name="Tester"):
    return await client.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": full_name},
    )


async def _login(client, email="new@test.com", password="password123"):
    return await client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_register_success(app_client):
    r = await _register(app_client, email=f"{uuid.uuid4().hex[:8]}@test.com")
    assert r.status_code == 201
    body = r.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"


@pytest.mark.anyio
async def test_register_duplicate_email(app_client):
    email = f"{uuid.uuid4().hex[:8]}@dup.com"
    r1 = await _register(app_client, email=email)
    assert r1.status_code == 201
    r2 = await _register(app_client, email=email)
    assert r2.status_code == 409


@pytest.mark.anyio
async def test_register_invalid_email(app_client):
    r = await _register(app_client, email="not-an-email")
    assert r.status_code == 422


@pytest.mark.anyio
async def test_register_short_password(app_client):
    r = await _register(app_client, password="short")
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_login_success(app_client):
    email = f"{uuid.uuid4().hex[:8]}@login.com"
    await _register(app_client, email=email, password="password123")
    r = await _login(app_client, email=email, password="password123")
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body


@pytest.mark.anyio
async def test_login_wrong_password(app_client):
    email = f"{uuid.uuid4().hex[:8]}@wrong.com"
    await _register(app_client, email=email, password="password123")
    r = await _login(app_client, email=email, password="wrongpassword")
    assert r.status_code == 401


@pytest.mark.anyio
async def test_login_nonexistent_user(app_client):
    r = await _login(app_client, email="noone@nowhere.com", password="whatever")
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# Token refresh
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_refresh_valid(app_client):
    email = f"{uuid.uuid4().hex[:8]}@refresh.com"
    reg = await _register(app_client, email=email)
    refresh_token = reg.json()["refresh_token"]
    r = await app_client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert r.status_code == 200
    assert "access_token" in r.json()


@pytest.mark.anyio
async def test_refresh_invalid_token(app_client):
    r = await app_client.post("/auth/refresh", json={"refresh_token": "bogus.token.here"})
    assert r.status_code == 401


@pytest.mark.anyio
async def test_refresh_expired_token(app_client):
    uid = str(uuid.uuid4())
    expired = create_refresh_token(uid, expires_days=-1)
    r = await app_client.post("/auth/refresh", json={"refresh_token": expired})
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# /auth/me
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_me_with_token(app_client):
    email = f"{uuid.uuid4().hex[:8]}@me.com"
    reg = await _register(app_client, email=email)
    token = reg.json()["access_token"]
    r = await app_client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == email


@pytest.mark.anyio
async def test_me_without_token(app_client):
    r = await app_client.get("/auth/me")
    assert r.status_code in (401, 403)
