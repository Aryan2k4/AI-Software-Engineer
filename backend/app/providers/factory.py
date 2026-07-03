"""Provider factory — resolves AI provider from settings."""
from __future__ import annotations

from functools import lru_cache

from app.core.config import get_settings
from app.core.exceptions import AppError
from app.providers.base import BaseAIProvider


@lru_cache(maxsize=1)
def get_ai_provider() -> BaseAIProvider:
    settings = get_settings()
    provider_name = settings.ai_provider.lower()

    if provider_name == "gemini":
        from app.providers.gemini.provider import GeminiProvider
        return GeminiProvider()
    elif provider_name == "groq":
        from app.providers.groq.provider import GroqProvider
        return GroqProvider()
    elif provider_name == "mock":
        from app.providers.mock.provider import MockProvider
        return MockProvider()
    elif provider_name == "grok":
        from app.providers.grok.provider import GrokProvider
        return GrokProvider()
    elif provider_name == "openrouter":
        from app.providers.openrouter.provider import OpenRouterProvider
        return OpenRouterProvider()
    else:
        raise AppError(f"Unknown AI provider: '{provider_name}'", "CONFIG_ERROR")
