"""Projects API router."""
from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, status

from app.api.dependencies.auth import get_current_user_id
from app.core.exceptions import NotFoundError, to_http_exception
from app.core.logging import get_logger
from app.models.project import GenerationStatus, Project, ProjectCreate, ProjectSummary
from app.providers.factory import get_ai_provider
from app.repositories.blueprints_repository import BlueprintsRepository
from app.repositories.projects_repository import ProjectsRepository
from app.services.generation_service import GenerationService

logger = get_logger(__name__)
router = APIRouter(prefix="/projects", tags=["projects"])



async def _run_generation(project_id: str, user_id: str, idea: str) -> None:
    """Background task: run 7-stage pipeline and persist result."""
    projects_repo = ProjectsRepository()
    blueprints_repo = BlueprintsRepository()

    try:
        provider = get_ai_provider()
        service = GenerationService(provider)

        async def on_stage(stage: int, _content: str) -> None:
            projects_repo.update_status(project_id, GenerationStatus.RUNNING, current_stage=stage)

        projects_repo.update_status(project_id, GenerationStatus.RUNNING, current_stage=0)
        sections = await service.run(idea, on_stage_complete=on_stage)

        blueprint = blueprints_repo.create(project_id, user_id, idea, sections)
        projects_repo.update_status(
            project_id,
            GenerationStatus.COMPLETED,
            current_stage=7,
            blueprint_id=blueprint.id,
        )
        logger.info("Project %s generation complete", project_id)

    except Exception as e:
        logger.error("Generation failed for project %s: %s", project_id, e)
        projects_repo.update_status(
            project_id, GenerationStatus.FAILED, error_message=str(e)
        )


@router.post("", response_model=Project, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
) -> Project:
    repo = ProjectsRepository()
    project = repo.create(user_id, body)
    background_tasks.add_task(_run_generation, project.id, user_id, body.original_idea)
    return project


@router.get("", response_model=list[ProjectSummary])
def list_projects(user_id: str = Depends(get_current_user_id)) -> list[ProjectSummary]:
    return ProjectsRepository().list_by_user(user_id)


@router.get("/{project_id}", response_model=Project)
def get_project(project_id: str, user_id: str = Depends(get_current_user_id)) -> Project:
    try:
        return ProjectsRepository().get_by_id(project_id, user_id)
    except NotFoundError as e:
        raise to_http_exception(e) from e


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_project(project_id: str, user_id: str = Depends(get_current_user_id)) -> None:
    try:
        ProjectsRepository().delete(project_id, user_id)
    except NotFoundError as e:
        raise to_http_exception(e) from e
