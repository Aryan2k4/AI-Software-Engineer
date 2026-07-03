"""Groq provider — fast inference via Groq's OpenAI-compatible API.

Groq hosts open models (Llama 3.x, Mixtral, etc.) on custom LPU hardware,
offering very low latency. Uses the OpenAI-compatible chat completions API.
Free tier available at https://console.groq.com
"""
from __future__ import annotations

import json
from collections.abc import AsyncIterator

import httpx

from app.core.config import get_settings
from app.core.exceptions import AIProviderError
from app.providers.base import BaseAIProvider, GenerationRequest, GenerationResponse

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_MODEL = "gemma2-9b-it"


class GroqProvider(BaseAIProvider):
    name = "groq"

    def __init__(self) -> None:
        settings = get_settings()
        if not settings.groq_api_key:
            raise AIProviderError("GROQ_API_KEY not configured", self.name)
        self._api_key = settings.groq_api_key
        self._model = DEFAULT_MODEL

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    def _build_messages(self, request: GenerationRequest) -> list[dict[str, str]]:
        messages = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        messages.append({"role": "user", "content": request.prompt})
        return messages

    async def generate(self, request: GenerationRequest) -> GenerationResponse:
        payload = {
            "model": self._model,
            "messages": self._build_messages(request),
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
        }
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(GROQ_API_URL, headers=self._headers(), json=payload)
                resp.raise_for_status()
                data = resp.json()

            content = data["choices"][0]["message"]["content"] or ""
            usage = data.get("usage", {})
            return GenerationResponse(
                content=content,
                provider=self.name,
                model=self._model,
                input_tokens=usage.get("prompt_tokens", 0),
                output_tokens=usage.get("completion_tokens", 0),
            )
        except httpx.HTTPStatusError as e:
            raise AIProviderError(f"HTTP {e.response.status_code}: {e.response.text}", self.name) from e
        except (httpx.HTTPError, KeyError, IndexError) as e:
            raise AIProviderError(str(e), self.name) from e

    async def stream(self, request: GenerationRequest) -> AsyncIterator[str]:
        payload = {
            "model": self._model,
            "messages": self._build_messages(request),
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "stream": True,
        }
        try:
            async with httpx.AsyncClient(timeout=60.0) as client, client.stream(
                "POST", GROQ_API_URL, headers=self._headers(), json=payload
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data_str = line[len("data: "):]
                    if data_str.strip() == "[DONE]":
                        break
                    chunk = json.loads(data_str)
                    delta = chunk["choices"][0]["delta"].get("content")
                    if delta:
                        yield delta
        except httpx.HTTPStatusError as e:
            raise AIProviderError(f"HTTP {e.response.status_code}: {e.response.text}", self.name) from e
        except httpx.HTTPError as e:
            raise AIProviderError(str(e), self.name) from e

    async def health_check(self) -> bool:
        try:
            req = GenerationRequest(prompt="ping", max_tokens=5)
            await self.generate(req)
            return True
        except AIProviderError:
            return False
