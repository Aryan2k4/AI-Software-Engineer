"""Export and Share domain models."""
from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field

from app.models.blueprint import BlueprintSections


class ExportFormat(StrEnum):
    MARKDOWN = "markdown"
    PDF = "pdf"
    JSON = "json"


class ExportStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Export(BaseModel):
    id: str
    project_id: str
    user_id: str
    format: ExportFormat
    status: ExportStatus = ExportStatus.PENDING
    file_url: str | None = None
    error_message: str | None = None
    created_at: str = ""
    completed_at: str | None = None


class ExportCreate(BaseModel):
    project_id: str
    format: ExportFormat


class ExportResponse(BaseModel):
    export_id: str
    status: ExportStatus
    file_url: str | None = None
    message: str = ""


# ─── Share ────────────────────────────────────────────────────────────────────

class ShareVisibility(StrEnum):
    PUBLIC = "public"
    PRIVATE = "private"


class ProjectShare(BaseModel):
    id: str
    project_id: str
    user_id: str
    share_token: str
    visibility: ShareVisibility = ShareVisibility.PUBLIC
    view_count: int = 0
    expires_at: str | None = None
    created_at: str = ""


class ShareCreate(BaseModel):
    project_id: str
    visibility: ShareVisibility = ShareVisibility.PUBLIC
    expires_in_days: int | None = Field(None, ge=1, le=365)


class ShareResponse(BaseModel):
    share_id: str
    share_token: str
    share_url: str
    visibility: ShareVisibility
    expires_at: str | None = None


class PublicBlueprintResponse(BaseModel):
    project_name: str
    original_idea: str
    sections: BlueprintSections
    created_at: str
    share_token: str
