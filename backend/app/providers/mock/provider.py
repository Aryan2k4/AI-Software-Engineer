"""Mock AI provider — deterministic, zero-latency, used in tests."""
from __future__ import annotations

from collections.abc import AsyncIterator

from app.providers.base import BaseAIProvider, GenerationRequest, GenerationResponse

_MOCK_BLUEPRINT = """
{
  "idea_clarification": {
    "title": "Mock Idea Clarification",
    "summary": "A mock clarification of the project idea.",
    "key_features": ["Feature A", "Feature B", "Feature C"],
    "target_users": "Developers and engineers",
    "success_metrics": ["Metric 1", "Metric 2"]
  },
  "tech_stack": {
    "frontend": {"framework": "React", "language": "TypeScript", "styling": "Tailwind CSS"},
    "backend": {"framework": "FastAPI", "language": "Python 3.12", "orm": "SQLAlchemy"},
    "database": {"primary": "PostgreSQL", "cache": "Redis"},
    "infrastructure": {"hosting": "AWS", "ci_cd": "GitHub Actions"}
  },
  "architecture": {
    "pattern": "Clean Architecture",
    "layers": ["Presentation", "Application", "Domain", "Infrastructure"],
    "diagram": "Mock architecture diagram description"
  },
  "database_schema": {
    "tables": [
      {"name": "users", "columns": ["id", "email", "created_at"]},
      {"name": "projects", "columns": ["id", "user_id", "name", "created_at"]}
    ]
  },
  "api_design": {
    "style": "REST",
    "base_url": "/api/v1",
    "endpoints": [
      {"method": "GET", "path": "/health", "description": "Health check"},
      {"method": "POST", "path": "/projects", "description": "Create project"}
    ]
  },
  "implementation_roadmap": {
    "phases": [
      {"phase": 1, "title": "Foundation", "duration": "2 weeks", "tasks": ["Setup repo", "Auth"]},
      {"phase": 2, "title": "Core", "duration": "4 weeks", "tasks": ["API", "Database"]}
    ]
  },
  "security_deployment": {
    "auth": "JWT via Supabase",
    "https": true,
    "environment": "Docker + GitHub Actions",
    "monitoring": "Sentry"
  },
  "testing_strategy": {
    "unit": "pytest / Vitest",
    "integration": "httpx TestClient",
    "e2e": "Playwright"
  },
  "documentation": {
    "api_docs": "OpenAPI / Swagger",
    "readme": "Comprehensive README with quickstart",
    "adr": "Architecture Decision Records"
  }
}
"""


class MockProvider(BaseAIProvider):
    name = "mock"

    async def generate(self, request: GenerationRequest) -> GenerationResponse:
        return GenerationResponse(
            content=_MOCK_BLUEPRINT,
            provider=self.name,
            model="mock-v1",
            input_tokens=len(request.prompt.split()),
            output_tokens=len(_MOCK_BLUEPRINT.split()),
        )

    async def stream(self, request: GenerationRequest) -> AsyncIterator[str]:
        words = _MOCK_BLUEPRINT.split()
        for i, word in enumerate(words):
            yield word + (" " if i < len(words) - 1 else "")

    async def health_check(self) -> bool:
        return True
