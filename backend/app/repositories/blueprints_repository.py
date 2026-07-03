"""BlueprintsRepository — data access layer for blueprints table."""
from __future__ import annotations

from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.models.blueprint import Blueprint, BlueprintSections
from app.utils.supabase_client import get_supabase_client

logger = get_logger(__name__)
TABLE = "blueprints"


class BlueprintsRepository:
    def __init__(self) -> None:
        self._db = get_supabase_client()

    def create(self, project_id: str, user_id: str, idea: str, sections: BlueprintSections) -> Blueprint:
        row = {
            "project_id": project_id,
            "user_id": user_id,
            "original_idea": idea,
            "sections": sections.model_dump(),
            "version": "1.1",
        }
        res = self._db.table(TABLE).insert(row).execute()
        d = res.data[0]
        return Blueprint(**{**d, "sections": BlueprintSections(**d["sections"])})

    def get_by_project(self, project_id: str, user_id: str) -> Blueprint:
        res = (
            self._db.table(TABLE)
            .select("*")
            .eq("project_id", project_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not res.data:
            raise NotFoundError("Blueprint", project_id)
        d = res.data
        return Blueprint(**{**d, "sections": BlueprintSections(**d["sections"])})

    def get_by_id(self, blueprint_id: str) -> Blueprint:
        res = (
            self._db.table(TABLE)
            .select("*")
            .eq("id", blueprint_id)
            .single()
            .execute()
        )
        if not res.data:
            raise NotFoundError("Blueprint", blueprint_id)
        d = res.data
        return Blueprint(**{**d, "sections": BlueprintSections(**d["sections"])})

    def update_sections(self, blueprint_id: str, sections: BlueprintSections) -> None:
        self._db.table(TABLE).update({"sections": sections.model_dump()}).eq("id", blueprint_id).execute()
