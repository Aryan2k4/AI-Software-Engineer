"""Blueprint domain models — PROMPT_SCHEMA_CONTRACT v1.1."""
from __future__ import annotations

from pydantic import BaseModel, Field


class IdeaClarification(BaseModel):
    title: str
    summary: str
    key_features: list[str] = Field(default_factory=list)
    target_users: str = ""
    success_metrics: list[str] = Field(default_factory=list)


class TechStackDetail(BaseModel):
    framework: str = ""
    language: str = ""
    styling: str = ""
    orm: str = ""
    cache: str = ""
    hosting: str = ""
    ci_cd: str = ""
    primary: str = ""


class TechStack(BaseModel):
    frontend: dict[str, str] = Field(default_factory=dict)
    backend: dict[str, str] = Field(default_factory=dict)
    database: dict[str, str] = Field(default_factory=dict)
    infrastructure: dict[str, str] = Field(default_factory=dict)


class Architecture(BaseModel):
    pattern: str = ""
    layers: list[str] = Field(default_factory=list)
    diagram: str = ""
    description: str = ""


class DBTable(BaseModel):
    name: str
    columns: list[str] = Field(default_factory=list)
    description: str = ""


class DatabaseSchema(BaseModel):
    tables: list[DBTable] = Field(default_factory=list)
    relationships: list[str] = Field(default_factory=list)


class APIEndpoint(BaseModel):
    method: str
    path: str
    description: str = ""
    auth_required: bool = True


class APIDesign(BaseModel):
    style: str = "REST"
    base_url: str = "/api/v1"
    endpoints: list[APIEndpoint] = Field(default_factory=list)
    versioning: str = ""


class RoadmapPhase(BaseModel):
    phase: int
    title: str
    duration: str = ""
    tasks: list[str] = Field(default_factory=list)


class ImplementationRoadmap(BaseModel):
    phases: list[RoadmapPhase] = Field(default_factory=list)
    total_duration: str = ""


class SecurityDeployment(BaseModel):
    auth: str = ""
    https: bool = True
    environment: str = ""
    monitoring: str = ""
    notes: list[str] = Field(default_factory=list)


class TestingStrategy(BaseModel):
    unit: str = ""
    integration: str = ""
    e2e: str = ""
    coverage_target: str = "80%"


class Documentation(BaseModel):
    api_docs: str = ""
    readme: str = ""
    adr: str = ""
    notes: list[str] = Field(default_factory=list)


class BlueprintSections(BaseModel):
    """All 9 sections of the engineering blueprint."""
    idea_clarification: IdeaClarification | None = None
    tech_stack: TechStack | None = None
    architecture: Architecture | None = None
    database_schema: DatabaseSchema | None = None
    api_design: APIDesign | None = None
    implementation_roadmap: ImplementationRoadmap | None = None
    security_deployment: SecurityDeployment | None = None
    testing_strategy: TestingStrategy | None = None
    documentation: Documentation | None = None


class Blueprint(BaseModel):
    id: str
    project_id: str
    user_id: str
    original_idea: str
    sections: BlueprintSections
    version: str = "1.1"
    created_at: str = ""
    updated_at: str = ""
