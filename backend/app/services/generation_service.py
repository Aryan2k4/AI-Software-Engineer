"""GenerationService — 7-stage Gemini AI pipeline.

PROMPT_SCHEMA_CONTRACT v1.1: each stage produces a specific JSON section.
Stages run sequentially; each result feeds context into the next.
"""
from __future__ import annotations

import json
import re
from collections.abc import Awaitable, Callable
from unittest import result

from app.core.exceptions import GenerationError
from app.core.logging import get_logger
from app.models.blueprint import (
    APIDesign,
    Architecture,
    BlueprintSections,
    DatabaseSchema,
    Documentation,
    IdeaClarification,
    ImplementationRoadmap,
    SecurityDeployment,
    TechStack,
    TestingStrategy,
)
from app.providers.base import BaseAIProvider, GenerationRequest

logger = get_logger(__name__)

StageCallback = Callable[[int, str], Awaitable[None]]

SYSTEM_PROMPT = """You are a Principal Software Engineer and Solutions Architect.
Your task is to produce a specific section of an engineering blueprint as valid JSON only.
Do NOT include markdown fences, preamble, or explanation — output raw JSON only.
"""

STAGE_PROMPTS = {
    1: """Given this project idea: {idea}

Produce the "idea_clarification" section as JSON:
{{
  "title": "string — concise project title",
  "summary": "string — 2-3 sentence description",
  "key_features": ["string", ...],
  "target_users": "string",
  "success_metrics": ["string", ...]
}}""",

    2: """Given this project idea: {idea}
Clarification: {stage1}

Produce the "tech_stack" section as JSON:
{{
  "frontend": {{"framework": "...", "language": "...", "styling": "..."}},
  "backend": {{"framework": "...", "language": "...", "orm": "..."}},
  "database": {{"primary": "...", "cache": "..."}},
  "infrastructure": {{"hosting": "...", "ci_cd": "..."}}
}}""",

    3: """Project: {idea}
Tech stack: {stage2}

Produce the "architecture" section as JSON:
{{
  "pattern": "string",
  "layers": ["string", ...],
  "diagram": "string — ASCII or textual representation",
  "description": "string — key architectural decisions"
}}""",

    4: """Project: {idea}
Architecture: {stage3}

Produce the "database_schema" section as JSON:
{{
  "tables": [
    {{"name": "string", "columns": ["string", ...], "description": "string"}},
    ...
  ],
  "relationships": ["string", ...]
}}""",

    5: """Project: {idea}
Architecture: {stage3}
Database: {stage4}

Produce the "api_design" section as JSON:
{{
  "style": "REST|GraphQL|gRPC",
  "base_url": "/api/v1",
  "endpoints": [
    {{"method": "GET|POST|PUT|DELETE|PATCH", "path": "/...", "description": "...", "auth_required": true}},
    ...
  ],
  "versioning": "string"
}}""",

    6: """Project: {idea}
Tech: {stage2}
Architecture: {stage3}
API: {stage5}

Produce the "implementation_roadmap" section as JSON:
{{
  "phases": [
    {{"phase": 1, "title": "string", "duration": "X weeks", "tasks": ["string", ...]}},
    ...
  ],
  "total_duration": "string"
}}""",

    7: """Project: {idea}
Tech: {stage2}
Architecture: {stage3}

Produce ALL THREE remaining sections as a single JSON object with keys
"security_deployment", "testing_strategy", "documentation":
{{
  "security_deployment": {{
    "auth": "string",
    "https": true,
    "environment": "string",
    "monitoring": "string",
    "notes": ["string", ...]
  }},
  "testing_strategy": {{
    "unit": "string",
    "integration": "string",
    "e2e": "string",
    "coverage_target": "string"
  }},
  "documentation": {{
    "api_docs": "string",
    "readme": "string",
    "adr": "string",
    "notes": ["string", ...]
  }}
}}""",
}


def _extract_json(text: str) -> dict:
    """Strip markdown fences and parse JSON from model output."""
    text = text.strip()
    # Remove ```json ... ``` or ``` ... ```
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise GenerationError("json_parse", f"Invalid JSON from model: {e}\n\nRaw: {text[:500]}") from e


class GenerationService:
    def __init__(self, provider: BaseAIProvider) -> None:
        self._provider = provider

    async def run(
        self,
        idea: str,
        on_stage_complete: StageCallback | None = None,
    ) -> BlueprintSections:
        """Run all 7 stages. Returns completed BlueprintSections."""
        ctx: dict[str, str] = {}
        sections = BlueprintSections()

        async def _stage(n: int, prompt_template: str) -> dict:
            prompt = prompt_template.format(idea=idea, **{f"stage{k}": v for k, v in ctx.items()})
            req = GenerationRequest(prompt=prompt, system_prompt=SYSTEM_PROMPT, temperature=0.4, max_tokens=2048)
            logger.info("Running stage %d/%d", n, 7)
            resp = await self._provider.generate(req)
            result = _extract_json(resp.content)
            # Only keep first 500 chars of each stage result to limit context size
            ctx[str(n)] = json.dumps(result)[:500]
            if on_stage_complete:
                await on_stage_complete(n, resp.content)
            return result

        def _extract(result: dict, key: str) -> dict:
            """Unwrap section key if present — supports mock's full-blueprint response."""
            return result.get(key, result)

        # Stage 1 — Idea clarification
        d1 = await _stage(1, STAGE_PROMPTS[1])
        sections.idea_clarification = IdeaClarification(**_extract(d1, "idea_clarification"))

        # Stage 2 — Tech stack
        d2 = await _stage(2, STAGE_PROMPTS[2])
        sections.tech_stack = TechStack(**_extract(d2, "tech_stack"))

        # Stage 3 — Architecture
        d3 = await _stage(3, STAGE_PROMPTS[3])
        sections.architecture = Architecture(**_extract(d3, "architecture"))

        # Stage 4 — Database schema
        d4 = await _stage(4, STAGE_PROMPTS[4])
        sections.database_schema = DatabaseSchema(**_extract(d4, "database_schema"))

        # Stage 5 — API design
        d5 = await _stage(5, STAGE_PROMPTS[5])
        sections.api_design = APIDesign(**_extract(d5, "api_design"))

        # Stage 6 — Roadmap
        d6 = await _stage(6, STAGE_PROMPTS[6])
        sections.implementation_roadmap = ImplementationRoadmap(**_extract(d6, "implementation_roadmap"))

        # Stage 7 — Security + Testing + Docs (batched)
        d7 = await _stage(7, STAGE_PROMPTS[7])
        sections.security_deployment = SecurityDeployment(**d7.get("security_deployment", {}))
        sections.testing_strategy = TestingStrategy(**d7.get("testing_strategy", {}))
        sections.documentation = Documentation(**d7.get("documentation", {}))

        return sections
