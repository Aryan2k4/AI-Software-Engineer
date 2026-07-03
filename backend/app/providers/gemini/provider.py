"""Google Gemini provider — primary AI backend."""
from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator

import google.generativeai as genai

from app.core.config import get_settings
from app.core.exceptions import AIProviderError
from app.core.logging import get_logger
from app.providers.base import BaseAIProvider, GenerationRequest, GenerationResponse

logger = get_logger(__name__)

DEFAULT_MODEL = "gemini-2.0-flash"


class GeminiProvider(BaseAIProvider):
    name = "gemini"

    def __init__(self) -> None:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise AIProviderError("GEMINI_API_KEY not configured", self.name)
        genai.configure(api_key=settings.gemini_api_key)
        self._model_name = DEFAULT_MODEL

    def _get_model(self, system_prompt: str = "") -> genai.GenerativeModel:
        kwargs: dict = {"model_name": self._model_name}
        if system_prompt:
            kwargs["system_instruction"] = system_prompt
        return genai.GenerativeModel(**kwargs)

    async def generate(self, request: GenerationRequest) -> GenerationResponse:
        try:
            model = self._get_model(request.system_prompt)
            config = genai.GenerationConfig(
                temperature=request.temperature,
                max_output_tokens=request.max_tokens,
            )
            # Run blocking SDK call in thread pool
            response = await asyncio.get_running_loop().run_in_executor(
                None,
                lambda: model.generate_content(request.prompt, generation_config=config),
            )
            content = response.text or ""
            usage = response.usage_metadata
            return GenerationResponse(
                content=content,
                provider=self.name,
                model=self._model_name,
                input_tokens=getattr(usage, "prompt_token_count", 0),
                output_tokens=getattr(usage, "candidates_token_count", 0),
            )
        except Exception as e:
            raise AIProviderError(str(e), self.name) from e

    async def stream(self, request: GenerationRequest) -> AsyncIterator[str]:
        try:
            model = self._get_model(request.system_prompt)
            config = genai.GenerationConfig(
                temperature=request.temperature,
                max_output_tokens=request.max_tokens,
            )
            response = await asyncio.get_running_loop().run_in_executor(
                None,
                lambda: model.generate_content(
                    request.prompt,
                    generation_config=config,
                    stream=True,
                ),
            )
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            raise AIProviderError(str(e), self.name) from e

    async def health_check(self) -> bool:
        try:
            model = genai.GenerativeModel(self._model_name)
            await asyncio.get_running_loop().run_in_executor(
                None, lambda: model.generate_content("ping")
            )
            return True
        except Exception:
            return False
