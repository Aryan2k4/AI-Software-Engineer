"""Unit tests for ExportService — create/process/get/list flows for all formats."""
from unittest.mock import MagicMock, patch

import pytest

from app.core.exceptions import ExportError, NotFoundError
from app.models.blueprint import Blueprint, BlueprintSections
from app.models.export_share import Export, ExportCreate, ExportFormat, ExportStatus
from app.models.project import Project
from app.services.export_service import ExportService


def _blueprint(project_id="proj-1", user_id="user-1") -> Blueprint:
    return Blueprint(
        id="bp-1",
        project_id=project_id,
        user_id=user_id,
        original_idea="A habit tracker app",
        sections=BlueprintSections(),
        version="1.1",
        created_at="2026-01-01T00:00:00Z",
    )


def _export(export_id="exp-1", fmt=ExportFormat.MARKDOWN, status=ExportStatus.PENDING) -> Export:
    return Export(
        id=export_id,
        project_id="proj-1",
        user_id="user-1",
        format=fmt,
        status=status,
        created_at="2026-01-01T00:00:00Z",
    )


@pytest.fixture
def service():
    with patch("app.services.export_service.get_supabase_client") as mock_db_getter, \
         patch("app.services.export_service.ExportsRepository") as MockExports, \
         patch("app.services.export_service.BlueprintsRepository") as MockBlueprints, \
         patch("app.services.export_service.ProjectsRepository") as MockProjects:
        mock_db = MagicMock()
        mock_db_getter.return_value = mock_db
        svc = ExportService()
        svc._exports = MockExports.return_value
        svc._blueprints = MockBlueprints.return_value
        svc._projects = MockProjects.return_value
        svc._db = mock_db
        yield svc


def test_create_export_verifies_project_ownership_then_creates(service):
    service._projects.get_by_id.return_value = Project(
        id="proj-1", user_id="user-1", name="Bloom", original_idea="idea", status="completed"
    )
    service._exports.create.return_value = _export()

    result = service.create_export("user-1", ExportCreate(project_id="proj-1", format=ExportFormat.MARKDOWN))

    service._projects.get_by_id.assert_called_once_with("proj-1", "user-1")
    service._exports.create.assert_called_once()
    assert result.id == "exp-1"


def test_create_export_raises_not_found_for_missing_project(service):
    service._projects.get_by_id.side_effect = NotFoundError("Project", "proj-x")

    with pytest.raises(NotFoundError):
        service.create_export("user-1", ExportCreate(project_id="proj-x", format=ExportFormat.PDF))

    service._exports.create.assert_not_called()


@pytest.mark.asyncio
async def test_process_export_markdown_success(service):
    service._exports.get_by_id.return_value = _export(fmt=ExportFormat.MARKDOWN)
    service._blueprints.get_by_project.return_value = _blueprint()
    service._db.storage.from_.return_value.create_signed_url.return_value = {
        "signedURL": "https://storage.example/signed-md"
    }

    result = await service.process_export("exp-1", "user-1")

    service._exports.update_status.assert_any_call("exp-1", ExportStatus.PROCESSING)
    service._db.storage.from_.return_value.upload.assert_called_once()
    upload_kwargs = service._db.storage.from_.return_value.upload.call_args.kwargs
    assert upload_kwargs["file_options"]["content-type"] == "text/markdown"
    service._exports.update_status.assert_any_call(
        "exp-1", ExportStatus.COMPLETED, file_url="https://storage.example/signed-md"
    )
    assert result.id == "exp-1"


@pytest.mark.asyncio
async def test_process_export_pdf_success(service):
    service._exports.get_by_id.return_value = _export(fmt=ExportFormat.PDF)
    service._blueprints.get_by_project.return_value = _blueprint()
    service._db.storage.from_.return_value.create_signed_url.return_value = {
        "signedUrl": "https://storage.example/signed-pdf"
    }

    await service.process_export("exp-1", "user-1")

    upload_kwargs = service._db.storage.from_.return_value.upload.call_args.kwargs
    assert upload_kwargs["file_options"]["content-type"] == "application/pdf"


@pytest.mark.asyncio
async def test_process_export_json_success(service):
    service._exports.get_by_id.return_value = _export(fmt=ExportFormat.JSON)
    service._blueprints.get_by_project.return_value = _blueprint()
    service._db.storage.from_.return_value.create_signed_url.return_value = {
        "signedURL": "https://storage.example/signed-json"
    }

    await service.process_export("exp-1", "user-1")

    upload_kwargs = service._db.storage.from_.return_value.upload.call_args.kwargs
    assert upload_kwargs["file_options"]["content-type"] == "application/json"
    file_bytes = upload_kwargs["file"]
    assert b'"id": "bp-1"' in file_bytes


@pytest.mark.asyncio
async def test_process_export_marks_failed_on_exception(service):
    service._exports.get_by_id.return_value = _export(fmt=ExportFormat.MARKDOWN)
    service._blueprints.get_by_project.side_effect = NotFoundError("Blueprint", "proj-1")

    with pytest.raises(NotFoundError):
        await service.process_export("exp-1", "user-1")

    failed_calls = [
        c for c in service._exports.update_status.call_args_list
        if c.args[1] == ExportStatus.FAILED
    ]
    assert len(failed_calls) == 1


def test_get_export_delegates_to_repository(service):
    service._exports.get_by_id.return_value = _export()
    result = service.get_export("exp-1", "user-1")
    service._exports.get_by_id.assert_called_once_with("exp-1", "user-1")
    assert result.id == "exp-1"


def test_list_exports_delegates_to_repository(service):
    service._exports.list_by_project.return_value = [_export(), _export(export_id="exp-2")]
    result = service.list_exports("proj-1", "user-1")
    service._exports.list_by_project.assert_called_once_with("proj-1", "user-1")
    assert len(result) == 2
