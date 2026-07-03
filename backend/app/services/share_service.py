"""ShareService — manages project share links."""
from __future__ import annotations

import contextlib

from app.core.config import get_settings
from app.core.logging import get_logger
from app.models.export_share import (
    ProjectShare,
    PublicBlueprintResponse,
    ShareCreate,
    ShareResponse,
)
from app.repositories.blueprints_repository import BlueprintsRepository
from app.repositories.projects_repository import ProjectsRepository
from app.repositories.shares_repository import SharesRepository
from app.services.token_service import build_share_url

logger = get_logger(__name__)


class ShareService:
    def __init__(self) -> None:
        self._shares = SharesRepository()
        self._blueprints = BlueprintsRepository()
        self._projects = ProjectsRepository()

    def create_share(self, user_id: str, data: ShareCreate) -> ShareResponse:
        # Verify project ownership
        self._projects.get_by_id(data.project_id, user_id)
        share = self._shares.create(user_id, data)
        settings = get_settings()
        # Use allowed_origins first entry as base URL
        base_url = settings.cors_origins[0] if settings.cors_origins else "http://localhost:5173"
        share_url = build_share_url(base_url, share.share_token)
        return ShareResponse(
            share_id=share.id,
            share_token=share.share_token,
            share_url=share_url,
            visibility=share.visibility,
            expires_at=share.expires_at,
        )

    def get_public_blueprint(self, token: str) -> PublicBlueprintResponse:
        share = self._shares.get_by_token(token)
        # Increment view count (best-effort)
        with contextlib.suppress(Exception):
            self._shares.increment_view_count(share.id)

        blueprint = self._blueprints.get_by_project(share.project_id, share.user_id)
        project = self._projects.get_by_id(share.project_id, share.user_id)

        return PublicBlueprintResponse(
            project_name=project.name,
            original_idea=blueprint.original_idea,
            sections=blueprint.sections.model_dump(),
            created_at=blueprint.created_at,
            share_token=token,
        )

    def list_shares(self, project_id: str, user_id: str) -> list[ProjectShare]:
        return self._shares.get_by_project(project_id, user_id)

    def revoke_share(self, share_id: str, user_id: str) -> None:
        self._shares.revoke(share_id, user_id)
