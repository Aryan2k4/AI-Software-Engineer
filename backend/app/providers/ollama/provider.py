"""Ollama provider — private, local-first inference over the Ollama HTTP API."""
from __future__ import annotations

from collections.abc import AsyncIterator

import httpx

from app.core.config import get_settings
from app.providers.base import BaseAIProvider, GenerationRequest, GenerationResponse


class OllamaProvider(BaseAIProvider):
    """Runs blueprint generation against a locally hosted Ollama instance."""

    name = "ollama"

    def __init__(self) -> None:
        settings = get_settings()
        self._base_url = settings.ollama_base_url.rstrip("/")
        self._model = settings.ollama_model

    def _payload(self, request: GenerationRequest, stream: bool) -> dict:
        prompt = request.prompt
        if request.system_prompt:
            prompt = f"{request.system_prompt}\n\n{prompt}"
        return {
            "model": self._model,
            "prompt": prompt,
            "stream": stream,
            "format": "json",
            "options": {"temperature": request.temperature, "num_predict": request.max_tokens},
        }

    async def generate(self, request: GenerationRequest) -> GenerationResponse:
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(f"{self._base_url}/api/generate", json=self._payload(request, False))
            response.raise_for_status()
            data = response.json()
        return GenerationResponse(
            content=data.get("response", ""), provider=self.name, model=data.get("model", self._model),
            input_tokens=data.get("prompt_eval_count", 0), output_tokens=data.get("eval_count", 0),
        )

    async def stream(self, request: GenerationRequest) -> AsyncIterator[str]:
        async with (
            httpx.AsyncClient(timeout=180.0) as client,
            client.stream("POST", f"{self._base_url}/api/generate", json=self._payload(request, True)) as response,
        ):
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line:
                    yield httpx.Response(200, content=line).json().get("response", "")

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self._base_url}/api/tags")
                return response.is_success
        except httpx.HTTPError:
            return False
