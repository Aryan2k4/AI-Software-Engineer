"""SharesRepository — data access layer for project_shares table."""
from __future__ import annotations

import secrets
from datetime import UTC

from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.models.export_share import ProjectShare, ShareCreate, ShareVisibility
from app.utils.supabase_client import get_supabase_client

logger = get_logger(__name__)
TABLE = "project_shares"


class SharesRepository:
    def __init__(self) -> None:
        self._db = get_supabase_client()

    def create(self, user_id: str, data: ShareCreate) -> ProjectShare:
        token = secrets.token_urlsafe(24)
        row: dict = {
            "user_id": user_id,
            "project_id": data.project_id,
            "share_token": token,
            "visibility": data.visibility.value,
            "view_count": 0,
        }
        if data.expires_in_days:
            from datetime import datetime, timedelta
            expires = datetime.now(UTC) + timedelta(days=data.expires_in_days)
            row["expires_at"] = expires.isoformat()
        res = self._db.table(TABLE).insert(row).execute()
        return ProjectShare(**res.data[0])

    def get_by_token(self, token: str) -> ProjectShare:
        res = (
            self._db.table(TABLE)
            .select("*")
            .eq("share_token", token)
            .eq("visibility", ShareVisibility.PUBLIC.value)
            .single()
            .execute()
        )
        if not res.data:
            raise NotFoundError("Share", token)
        return ProjectShare(**res.data)

    def get_by_project(self, project_id: str, user_id: str) -> list[ProjectShare]:
        res = (
            self._db.table(TABLE)
            .select("*")
            .eq("project_id", project_id)
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return [ProjectShare(**r) for r in (res.data or [])]

    def increment_view_count(self, share_id: str) -> None:
        # Use RPC to atomically increment
        self._db.rpc("increment_share_view_count", {"share_id": share_id}).execute()

    def revoke(self, share_id: str, user_id: str) -> None:
        self._db.table(TABLE).delete().eq("id", share_id).eq("user_id", user_id).execute()
