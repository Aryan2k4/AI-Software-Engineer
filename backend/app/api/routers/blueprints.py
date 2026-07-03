"""Blueprints API router."""
from fastapi import APIRouter, Depends

from app.api.dependencies.auth import get_current_user_id
from app.core.exceptions import NotFoundError, to_http_exception
from app.models.blueprint import Blueprint
from app.repositories.blueprints_repository import BlueprintsRepository

router = APIRouter(prefix="/blueprints", tags=["blueprints"])


@router.get("/project/{project_id}", response_model=Blueprint)
def get_blueprint_by_project(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
) -> Blueprint:
    try:
        return BlueprintsRepository().get_by_project(project_id, user_id)
    except NotFoundError as e:
        raise to_http_exception(e) from e
