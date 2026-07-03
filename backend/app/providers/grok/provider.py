"""Grok provider stub — not yet production-ready."""
from __future__ import annotations

from collections.abc import AsyncIterator

from app.core.exceptions import AIProviderError
from app.providers.base import BaseAIProvider, GenerationRequest, GenerationResponse


class GrokProvider(BaseAIProvider):
    name = "grok"

    async def generate(self, request: GenerationRequest) -> GenerationResponse:
        raise AIProviderError("Grok provider not yet implemented", self.name)

    async def stream(self, request: GenerationRequest) -> AsyncIterator[str]:
        raise AIProviderError("Grok provider not yet implemented", self.name)
        yield  # make mypy happy

    async def health_check(self) -> bool:
        return False
