"""Integration tests for blueprints API endpoints."""
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


def test_get_blueprint_not_found():
    client = make_client()
    from app.core.exceptions import NotFoundError
    with mock_auth(), \
         patch("app.api.routers.blueprints.BlueprintsRepository") as mock_repo:
        mock_repo.return_value.get_by_project.side_effect = NotFoundError("Blueprint", "proj-1")
        resp = client.get(
            "/api/v1/blueprints/project/proj-1",
            headers={"Authorization": "Bearer fake-token"},
        )
    assert resp.status_code == 404


def test_get_blueprint_requires_auth():
    client = make_client()
    resp = client.get("/api/v1/blueprints/project/proj-1")
    assert resp.status_code == 403  # HTTPBearer: no Authorization header present
