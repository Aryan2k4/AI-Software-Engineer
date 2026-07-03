"""Shares API router — authenticated share management + public read."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.api.dependencies.auth import get_current_user_id
from app.core.exceptions import NotFoundError, to_http_exception
from app.models.export_share import (
    ProjectShare,
    PublicBlueprintResponse,
    ShareCreate,
    ShareResponse,
)
from app.services.share_service import ShareService

# Authenticated routes
auth_router = APIRouter(prefix="/shares")

@auth_router.post("", response_model=ShareResponse, status_code=status.HTTP_201_CREATED)
def create_share(
    body: ShareCreate,
    user_id: str = Depends(get_current_user_id),
) -> ShareResponse:
    try:
        return ShareService().create_share(user_id, body)
    except NotFoundError as e:
        raise to_http_exception(e) from e


@auth_router.get("/project/{project_id}", response_model=list[ProjectShare])
def list_project_shares(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
) -> list[ProjectShare]:
    return ShareService().list_shares(project_id, user_id)


@auth_router.delete("/{share_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def revoke_share(
    share_id: str,
    user_id: str = Depends(get_current_user_id),
) -> None:
    ShareService().revoke_share(share_id, user_id)


# Public route — no auth required
public_router = APIRouter(prefix="/public")

@public_router.get("/share/{token}", response_model=PublicBlueprintResponse)
def get_public_share(token: str) -> PublicBlueprintResponse:
    try:
        return ShareService().get_public_blueprint(token)
    except NotFoundError as e:
        raise to_http_exception(e) from e
