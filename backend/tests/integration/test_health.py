"""Integration tests — health endpoint."""
from unittest.mock import AsyncMock, patch


def test_health_returns_ok(client):
    with patch("app.api.routers.health.get_ai_provider") as mock_factory:
        mock_provider = AsyncMock()
        mock_provider.health_check.return_value = True
        mock_factory.return_value = mock_provider
        resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("ok", "degraded")
