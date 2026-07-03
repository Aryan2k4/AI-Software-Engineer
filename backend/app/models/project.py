"""Project domain models."""
from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field


class GenerationStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class Project(BaseModel):
    id: str
    user_id: str
    name: str
    original_idea: str
    status: GenerationStatus = GenerationStatus.PENDING
    current_stage: int = 0
    total_stages: int = 7
    blueprint_id: str | None = None
    error_message: str | None = None
    created_at: str = ""
    updated_at: str = ""


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    original_idea: str = Field(..., min_length=10, max_length=2000)


class ProjectSummary(BaseModel):
    id: str
    name: str
    status: GenerationStatus
    current_stage: int
    total_stages: int
    created_at: str
    has_blueprint: bool = False
