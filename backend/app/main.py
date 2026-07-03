"""FastAPI application entrypoint."""
from __future__ import annotations

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routers import blueprints, exports, health, projects
from app.api.routers.shares import auth_router as shares_auth_router
from app.api.routers.shares import public_router as shares_public_router
from app.core.config import get_settings
from app.core.exceptions import AppError, to_http_exception
from app.core.logging import get_logger, setup_logging

setup_logging()
logger = get_logger(__name__)
settings = get_settings()

# ─── Sentry ───────────────────────────────────────────────────────────────────
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.app_env,
        traces_sample_rate=0.1,
    )
    logger.info("Sentry initialized")

# ─── App ──────────────────────────────────────────────────────────────────────
_docs_url = None if settings.is_production else "/api/docs"
_redoc_url = None if settings.is_production else "/api/redoc"
_openapi_url = None if settings.is_production else "/api/openapi.json"

app = FastAPI(
    title="AI Software Engineer",
    description="Transform a one-sentence idea into a 9-section engineering blueprint.",
    version="1.1.0",
    docs_url=_docs_url,
    redoc_url=_redoc_url,
    openapi_url=_openapi_url,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
_allowed_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=_allowed_methods,
    allow_headers=["*"],
)

# ─── Exception handlers ───────────────────────────────────────────────────────
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    http_exc = to_http_exception(exc)
    return JSONResponse(status_code=http_exc.status_code, content={"detail": http_exc.detail})


# ─── Routers ──────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(health.router)
app.include_router(projects.router, prefix=API_PREFIX)
app.include_router(blueprints.router, prefix=API_PREFIX)
app.include_router(exports.router, prefix=API_PREFIX)
app.include_router(shares_auth_router, prefix=API_PREFIX)
app.include_router(shares_public_router, prefix=API_PREFIX)

logger.info("AI Software Engineer API started [%s]", settings.app_env)
