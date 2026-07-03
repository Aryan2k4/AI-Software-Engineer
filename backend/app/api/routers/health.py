"""Health check router."""
from fastapi import APIRouter

from app.core.config import get_settings
from app.providers.factory import get_ai_provider

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    settings = get_settings()
    provider = get_ai_provider()
    provider_ok = await provider.health_check()
    return {
        "status": "ok" if provider_ok else "degraded",
        "provider": settings.ai_provider,
        "provider_healthy": provider_ok,
        "env": settings.app_env,
    }
