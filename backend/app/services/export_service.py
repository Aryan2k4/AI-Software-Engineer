"""ExportService — orchestrates export creation, processing, and storage."""
from __future__ import annotations

import asyncio
import json

from app.core.exceptions import ExportError
from app.core.logging import get_logger
from app.models.export_share import Export, ExportCreate, ExportFormat, ExportStatus
from app.repositories.blueprints_repository import BlueprintsRepository
from app.repositories.exports_repository import ExportsRepository
from app.repositories.projects_repository import ProjectsRepository
from app.services.markdown_export import blueprint_to_markdown
from app.services.pdf_export import blueprint_to_pdf_bytes
from app.utils.supabase_client import get_supabase_client

logger = get_logger(__name__)
STORAGE_BUCKET = "exports"


class ExportService:
    def __init__(self) -> None:
        self._exports = ExportsRepository()
        self._blueprints = BlueprintsRepository()
        self._projects = ProjectsRepository()
        self._db = get_supabase_client()

    def create_export(self, user_id: str, data: ExportCreate) -> Export:
        # Verify project ownership
        self._projects.get_by_id(data.project_id, user_id)
        return self._exports.create(user_id, data)

    async def process_export(self, export_id: str, user_id: str) -> Export:
        export = self._exports.get_by_id(export_id, user_id)
        self._exports.update_status(export_id, ExportStatus.PROCESSING)

        try:
            # Get blueprint for the project
            blueprint = self._blueprints.get_by_project(export.project_id, user_id)

            if export.format == ExportFormat.MARKDOWN:
                content = blueprint_to_markdown(blueprint)
                file_bytes = content.encode("utf-8")
                content_type = "text/markdown"
                filename = f"blueprint-{export.project_id}.md"

            elif export.format == ExportFormat.PDF:
                file_bytes = await asyncio.get_running_loop().run_in_executor(
                    None, lambda: blueprint_to_pdf_bytes(blueprint)
                )
                content_type = "application/pdf"
                filename = f"blueprint-{export.project_id}.pdf"

            elif export.format == ExportFormat.JSON:
                data_dict = {
                    "id": blueprint.id,
                    "project_id": blueprint.project_id,
                    "original_idea": blueprint.original_idea,
                    "sections": blueprint.sections.model_dump(),
                    "version": blueprint.version,
                }
                file_bytes = json.dumps(data_dict, indent=2).encode("utf-8")
                content_type = "application/json"
                filename = f"blueprint-{export.project_id}.json"

            else:
                raise ExportError(str(export.format), "Unknown format")

            # Upload to Supabase Storage
            storage_path = f"{user_id}/{export_id}/{filename}"
            self._db.storage.from_(STORAGE_BUCKET).upload(
                path=storage_path,
                file=file_bytes,
                file_options={"content-type": content_type},
            )

            # Get signed URL (valid 7 days)
            url_response = self._db.storage.from_(STORAGE_BUCKET).create_signed_url(
                storage_path, expires_in=604800
            )
            file_url = url_response.get("signedURL") or url_response.get("signedUrl", "")

            self._exports.update_status(export_id, ExportStatus.COMPLETED, file_url=file_url)
            return self._exports.get_by_id(export_id, user_id)

        except Exception as e:
            logger.error("Export %s failed: %s", export_id, e)
            self._exports.update_status(export_id, ExportStatus.FAILED, error_message=str(e))
            raise

    def get_export(self, export_id: str, user_id: str) -> Export:
        return self._exports.get_by_id(export_id, user_id)

    def list_exports(self, project_id: str, user_id: str) -> list[Export]:
        return self._exports.list_by_project(project_id, user_id)
