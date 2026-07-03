from __future__ import annotations

from app.core.logging import get_logger
from app.utils.supabase_client import get_supabase_client

logger = get_logger(__name__)


def decode_supabase_jwt(token: str) -> dict | None:
    """Verify a Supabase JWT by calling Supabase Auth API directly.

    This works with both legacy HS256 tokens AND new RS256 JWT Signing Keys
    because Supabase itself validates the token — we don't need to know
    which algorithm was used.
    """
    try:
        client = get_supabase_client()
        response = client.auth.get_user(token)
        if response and response.user:
            return {
                "sub": response.user.id,
                "email": response.user.email,
            }
        return None
    except Exception as e:
        logger.warning("Token verification failed: %s", e)
        return None


def extract_user_id(payload: dict) -> str | None:
    return payload.get("sub")