"""Unit tests for ShareService."""
from unittest.mock import MagicMock, patch

import pytest

from app.core.exceptions import NotFoundError
from app.models.blueprint import Blueprint, BlueprintSections
from app.models.export_share import ProjectShare, ShareCreate, ShareVisibility
from app.models.project import Project
from app.services.share_service import ShareService


def _share(share_id="share-1", token="tok_abc123") -> ProjectShare:
    return ProjectShare(
        id=share_id,
        project_id="proj-1",
        user_id="user-1",
        share_token=token,
        visibility=ShareVisibility.PUBLIC,
        view_count=0,
        created_at="2026-01-01T00:00:00Z",
    )


def _blueprint() -> Blueprint:
    return Blueprint(
        id="bp-1",
        project_id="proj-1",
        user_id="user-1",
        original_idea="A habit tracker app",
        sections=BlueprintSections(),
        created_at="2026-01-01T00:00:00Z",
    )


@pytest.fixture
def service():
    with patch("app.services.share_service.SharesRepository") as MockShares, \
         patch("app.services.share_service.BlueprintsRepository") as MockBlueprints, \
         patch("app.services.share_service.ProjectsRepository") as MockProjects, \
         patch("app.services.share_service.get_settings") as mock_settings:
        mock_settings.return_value = MagicMock(cors_origins=["http://localhost:5173"])
        svc = ShareService()
        svc._shares = MockShares.return_value
        svc._blueprints = MockBlueprints.return_value
        svc._projects = MockProjects.return_value
        yield svc


def test_create_share_verifies_ownership_and_builds_url(service):
    service._projects.get_by_id.return_value = Project(
        id="proj-1", user_id="user-1", name="Bloom", original_idea="idea", status="completed"
    )
    service._shares.create.return_value = _share()

    result = service.create_share("user-1", ShareCreate(project_id="proj-1", visibility=ShareVisibility.PUBLIC))

    service._projects.get_by_id.assert_called_once_with("proj-1", "user-1")
    assert result.share_url == "http://localhost:5173/share/tok_abc123"
    assert result.share_token == "tok_abc123"


def test_create_share_raises_not_found_for_missing_project(service):
    service._projects.get_by_id.side_effect = NotFoundError("Project", "proj-x")

    with pytest.raises(NotFoundError):
        service.create_share("user-1", ShareCreate(project_id="proj-x"))

    service._shares.create.assert_not_called()


def test_get_public_blueprint_returns_response_and_increments_views(service):
    service._shares.get_by_token.return_value = _share()
    service._blueprints.get_by_project.return_value = _blueprint()
    service._projects.get_by_id.return_value = Project(
        id="proj-1", user_id="user-1", name="Bloom", original_idea="idea", status="completed"
    )

    result = service.get_public_blueprint("tok_abc123")

    service._shares.increment_view_count.assert_called_once_with("share-1")
    assert result.project_name == "Bloom"
    assert result.share_token == "tok_abc123"


def test_get_public_blueprint_raises_not_found_for_bad_token(service):
    service._shares.get_by_token.side_effect = NotFoundError("Share", "bad-token")

    with pytest.raises(NotFoundError):
        service.get_public_blueprint("bad-token")


def test_get_public_blueprint_tolerates_view_count_failure(service):
    """Incrementing the view count is best-effort and must not break the read."""
    service._shares.get_by_token.return_value = _share()
    service._shares.increment_view_count.side_effect = Exception("rpc unavailable")
    service._blueprints.get_by_project.return_value = _blueprint()
    service._projects.get_by_id.return_value = Project(
        id="proj-1", user_id="user-1", name="Bloom", original_idea="idea", status="completed"
    )

    result = service.get_public_blueprint("tok_abc123")

    assert result.project_name == "Bloom"


def test_list_shares_delegates_to_repository(service):
    service._shares.get_by_project.return_value = [_share()]
    result = service.list_shares("proj-1", "user-1")
    service._shares.get_by_project.assert_called_once_with("proj-1", "user-1")
    assert len(result) == 1


def test_revoke_share_delegates_to_repository(service):
    service.revoke_share("share-1", "user-1")
    service._shares.revoke.assert_called_once_with("share-1", "user-1")
