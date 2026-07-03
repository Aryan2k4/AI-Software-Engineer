"""ProjectsRepository — data access layer for projects table."""
from __future__ import annotations

from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.models.project import GenerationStatus, Project, ProjectCreate, ProjectSummary
from app.utils.supabase_client import get_supabase_client

logger = get_logger(__name__)
TABLE = "projects"


class ProjectsRepository:
    def __init__(self) -> None:
        self._db = get_supabase_client()

    def create(self, user_id: str, data: ProjectCreate) -> Project:
        row = {
            "user_id": user_id,
            "name": data.name,
            "original_idea": data.original_idea,
            "status": GenerationStatus.PENDING.value,
            "current_stage": 0,
            "total_stages": 7,
        }
        res = self._db.table(TABLE).insert(row).execute()
        return Project(**res.data[0])

    def get_by_id(self, project_id: str, user_id: str) -> Project:
        res = (
            self._db.table(TABLE)
            .select("*")
            .eq("id", project_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not res.data:
            raise NotFoundError("Project", project_id)
        return Project(**res.data)

    def list_by_user(self, user_id: str) -> list[ProjectSummary]:
        res = (
            self._db.table(TABLE)
            .select("id, name, status, current_stage, total_stages, created_at, blueprint_id")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return [
            ProjectSummary(
                **{**r, "has_blueprint": r.get("blueprint_id") is not None}
            )
            for r in (res.data or [])
        ]

    def update_status(
        self,
        project_id: str,
        status: GenerationStatus,
        current_stage: int | None = None,
        error_message: str | None = None,
        blueprint_id: str | None = None,
    ) -> None:
        updates: dict = {"status": status.value}
        if current_stage is not None:
            updates["current_stage"] = current_stage
        if error_message is not None:
            updates["error_message"] = error_message
        if blueprint_id is not None:
            updates["blueprint_id"] = blueprint_id
        self._db.table(TABLE).update(updates).eq("id", project_id).execute()

    def delete(self, project_id: str, user_id: str) -> None:
        self._db.table(TABLE).delete().eq("id", project_id).eq("user_id", user_id).execute()
