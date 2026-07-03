"""ExportsRepository — data access layer for exports table."""
from __future__ import annotations

from datetime import UTC

from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.models.export_share import Export, ExportCreate, ExportStatus
from app.utils.supabase_client import get_supabase_client

logger = get_logger(__name__)
TABLE = "exports"


class ExportsRepository:
    def __init__(self) -> None:
        self._db = get_supabase_client()

    def create(self, user_id: str, data: ExportCreate) -> Export:
        row = {
            "user_id": user_id,
            "project_id": data.project_id,
            "format": data.format.value,
            "status": ExportStatus.PENDING.value,
        }
        res = self._db.table(TABLE).insert(row).execute()
        return Export(**res.data[0])

    def get_by_id(self, export_id: str, user_id: str) -> Export:
        res = (
            self._db.table(TABLE)
            .select("*")
            .eq("id", export_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not res.data:
            raise NotFoundError("Export", export_id)
        return Export(**res.data)

    def list_by_project(self, project_id: str, user_id: str) -> list[Export]:
        res = (
            self._db.table(TABLE)
            .select("*")
            .eq("project_id", project_id)
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return [Export(**r) for r in (res.data or [])]

    def update_status(
        self,
        export_id: str,
        status: ExportStatus,
        file_url: str | None = None,
        error_message: str | None = None,
    ) -> None:
        updates: dict = {"status": status.value}
        if file_url is not None:
            updates["file_url"] = file_url
        if error_message is not None:
            updates["error_message"] = error_message
        if status == ExportStatus.COMPLETED:
            from datetime import datetime
            updates["completed_at"] = datetime.now(UTC).isoformat()
        self._db.table(TABLE).update(updates).eq("id", export_id).execute()

    def delete(self, export_id: str, user_id: str) -> None:
        self._db.table(TABLE).delete().eq("id", export_id).eq("user_id", user_id).execute()
