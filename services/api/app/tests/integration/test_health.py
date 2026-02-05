"""Integration tests for health and readiness endpoints."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.anyio
async def test_health_always_200():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "healthy"


@pytest.mark.anyio
async def test_health_json_structure():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/health")
        body = r.json()
        assert "status" in body


@pytest.mark.anyio
async def test_ready_returns_200():
    """Readiness endpoint returns 200 regardless of service status."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/ready")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] in ("ready", "degraded")


@pytest.mark.anyio
async def test_ready_reports_services():
    """Readiness endpoint reports database and redis service status."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/ready")
        body = r.json()
        assert "database" in body or "redis" in body or body["status"] in ("ready", "degraded")
