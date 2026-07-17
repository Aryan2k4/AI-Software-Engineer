"""Integration tests for exports API endpoints."""
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.core.exceptions import NotFoundError
from app.models.export_share import Export, ExportFormat, ExportStatus


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


def _export(export_id="exp-1", fmt=ExportFormat.MARKDOWN, status=ExportStatus.PENDING) -> Export:
    return Export(
        id=export_id,
        project_id="proj-1",
        user_id="test-user-123",
        format=fmt,
        status=status,
        created_at="2026-01-01T00:00:00Z",
    )


def test_create_export_requires_auth():
    client = make_client()
    resp = client.post("/api/v1/exports", json={"project_id": "proj-1", "format": "markdown"})
    assert resp.status_code == 403  # HTTPBearer: no Authorization header present


def test_create_export_returns_202_when_queued():
    client = make_client()
    with mock_auth(), patch("app.api.routers.exports.ExportService") as MockSvc:
        MockSvc.return_value.create_export.return_value = _export()
        resp = client.post(
            "/api/v1/exports",
            json={"project_id": "proj-1", "format": "markdown"},
            headers={"Authorization": "Bearer fake-token"},
        )
    assert resp.status_code == 202
    body = resp.json()
    assert body["export_id"] == "exp-1"
    assert body["status"] == "pending"


def test_create_export_404_for_missing_project():
    client = make_client()
    with mock_auth(), patch("app.api.routers.exports.ExportService") as MockSvc:
        MockSvc.return_value.create_export.side_effect = NotFoundError("Project", "proj-x")
        resp = client.post(
            "/api/v1/exports",
            json={"project_id": "proj-x", "format": "pdf"},
            headers={"Authorization": "Bearer fake-token"},
        )
    assert resp.status_code == 404


def test_create_export_rejects_invalid_format():
    client = make_client()
    with mock_auth():
        resp = client.post(
            "/api/v1/exports",
            json={"project_id": "proj-1", "format": "docx"},
            headers={"Authorization": "Bearer fake-token"},
        )
    assert resp.status_code == 422


def test_get_export_requires_auth():
    client = make_client()
    resp = client.get("/api/v1/exports/exp-1")
    assert resp.status_code == 403


def test_get_export_returns_export():
    client = make_client()
    with mock_auth(), patch("app.api.routers.exports.ExportService") as MockSvc:
        MockSvc.return_value.get_export.return_value = _export(status=ExportStatus.COMPLETED)
        resp = client.get(
            "/api/v1/exports/exp-1",
            headers={"Authorization": "Bearer fake-token"},
        )
    assert resp.status_code == 200
    assert resp.json()["status"] == "completed"


def test_get_export_404_when_not_found():
    client = make_client()
    with mock_auth(), patch("app.api.routers.exports.ExportService") as MockSvc:
        MockSvc.return_value.get_export.side_effect = NotFoundError("Export", "exp-x")
        resp = client.get(
            "/api/v1/exports/exp-x",
            headers={"Authorization": "Bearer fake-token"},
        )
    assert resp.status_code == 404


def test_list_project_exports_requires_auth():
    client = make_client()
    resp = client.get("/api/v1/exports/project/proj-1")
    assert resp.status_code == 403


def test_list_project_exports_returns_list():
    client = make_client()
    with mock_auth(), patch("app.api.routers.exports.ExportService") as MockSvc:
        MockSvc.return_value.list_exports.return_value = [_export(), _export(export_id="exp-2")]
        resp = client.get(
            "/api/v1/exports/project/proj-1",
            headers={"Authorization": "Bearer fake-token"},
        )
    assert resp.status_code == 200
    assert len(resp.json()) == 2
