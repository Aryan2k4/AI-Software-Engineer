"""Integration tests for projects API endpoints using mocked repositories."""
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
    """Patch JWT verification to return a test user ID."""
    return patch(
        "app.api.dependencies.auth.decode_supabase_jwt",
        return_value={"sub": user_id},
    )


def test_list_projects_unauthenticated():
    client = make_client()
    resp = client.get("/api/v1/projects")
    assert resp.status_code == 403  # HTTPBearer: no Authorization header present


def test_list_projects_authenticated_empty():
    client = make_client()
    with mock_auth(), \
         patch("app.api.routers.projects.ProjectsRepository") as mock_repo:
        mock_repo.return_value.list_by_user.return_value = []
        resp = client.get(
            "/api/v1/projects",
            headers={"Authorization": "Bearer fake-token"},
        )
    assert resp.status_code == 200
    assert resp.json() == []


def test_get_project_not_found():
    client = make_client()
    from app.core.exceptions import NotFoundError
    with mock_auth(), \
         patch("app.api.routers.projects.ProjectsRepository") as mock_repo:
        mock_repo.return_value.get_by_id.side_effect = NotFoundError("Project", "abc")
        resp = client.get(
            "/api/v1/projects/abc",
            headers={"Authorization": "Bearer fake-token"},
        )
    assert resp.status_code == 404
    assert resp.json()["detail"]["code"] == "NOT_FOUND"


def test_delete_project_no_auth():
    client = make_client()
    resp = client.delete("/api/v1/projects/abc")
    assert resp.status_code == 403  # HTTPBearer: no Authorization header present
