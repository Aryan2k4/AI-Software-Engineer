"""Exports API router."""
from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, status

from app.api.dependencies.auth import get_current_user_id
from app.core.exceptions import NotFoundError, to_http_exception
from app.core.logging import get_logger
from app.models.export_share import Export, ExportCreate, ExportResponse
from app.services.export_service import ExportService

logger = get_logger(__name__)
router = APIRouter(prefix="/exports", tags=["exports"])


@router.post("", response_model=ExportResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_export(
    body: ExportCreate,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
) -> ExportResponse:
    svc = ExportService()
    try:
        export = svc.create_export(user_id, body)
    except NotFoundError as e:
        raise to_http_exception(e) from e

    async def process() -> None:
        try:
            await svc.process_export(export.id, user_id)
        except Exception as e:
            logger.error("Background export %s failed: %s", export.id, e)

    background_tasks.add_task(process)
    return ExportResponse(
        export_id=export.id,
        status=export.status,
        message="Export queued — subscribe to Realtime for updates",
    )


@router.get("/{export_id}", response_model=Export)
def get_export(
    export_id: str,
    user_id: str = Depends(get_current_user_id),
) -> Export:
    try:
        return ExportService().get_export(export_id, user_id)
    except NotFoundError as e:
        raise to_http_exception(e) from e


@router.get("/project/{project_id}", response_model=list[Export])
def list_project_exports(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
) -> list[Export]:
    return ExportService().list_exports(project_id, user_id)
