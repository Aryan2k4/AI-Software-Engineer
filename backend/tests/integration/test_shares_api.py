"""Integration tests for shares API endpoints."""
from unittest.mock import patch

from fastapi.testclient import TestClient


def make_client():
    from app.core.config import get_settings
    from app.providers.factory import get_ai_provider
    get_settings.cache_clear()
    get_ai_provider.cache_clear()
    from app.main import app
    return TestClient(app)


def mock_auth(user_id="test-user-123"):
    return patch(
        "app.api.dependencies.auth.decode_supabase_jwt",
        return_value={"sub": user_id},
    )


def test_public_share_not_found():
    client = make_client()
    from app.core.exceptions import NotFoundError
    with patch("app.api.routers.shares.ShareService") as mock_svc:
        mock_svc.return_value.get_public_blueprint.side_effect = NotFoundError("Share", "bad-token")
        resp = client.get("/api/v1/public/share/bad-token")
    assert resp.status_code == 404


def test_create_share_requires_auth():
    client = make_client()
    resp = client.post(
        "/api/v1/shares",
        json={"project_id": "proj-1", "visibility": "public"},
    )
    assert resp.status_code == 403  # HTTPBearer: no Authorization header present


def test_revoke_share_requires_auth():
    client = make_client()
    resp = client.delete("/api/v1/shares/share-123")
    assert resp.status_code == 403  # HTTPBearer: no Authorization header present
