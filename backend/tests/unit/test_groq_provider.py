"""Unit tests for GroqProvider using httpx MockTransport — no real network calls."""
import httpx
import pytest

from app.core.exceptions import AIProviderError
from app.providers.base import GenerationRequest


def _make_groq_provider() -> "GroqProvider":  # noqa: F821
    """Construct a GroqProvider with a fake API key, bypassing real settings."""
    from app.providers.groq.provider import GroqProvider

    provider = GroqProvider.__new__(GroqProvider)
    provider._api_key = "test-key"
    provider._model = "llama-3.3-70b-versatile"
    return provider


def _patch_async_client(monkeypatch, transport: httpx.MockTransport) -> None:
    """Replace httpx.AsyncClient used inside the groq provider module with a mocked-transport client."""
    import app.providers.groq.provider as groq_module

    real_async_client = httpx.AsyncClient

    def fake_async_client(*args, **kwargs):
        kwargs["transport"] = transport
        return real_async_client(*args, **kwargs)

    monkeypatch.setattr(groq_module.httpx, "AsyncClient", fake_async_client)


@pytest.mark.asyncio
async def test_groq_generate_success(monkeypatch):
    provider = _make_groq_provider()

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "choices": [{"message": {"content": '{"title": "Test"}'}}],
                "usage": {"prompt_tokens": 10, "completion_tokens": 5},
            },
        )

    _patch_async_client(monkeypatch, httpx.MockTransport(handler))

    resp = await provider.generate(GenerationRequest(prompt="hello"))
    assert resp.provider == "groq"
    assert resp.content == '{"title": "Test"}'
    assert resp.input_tokens == 10
    assert resp.output_tokens == 5


@pytest.mark.asyncio
async def test_groq_generate_http_error(monkeypatch):
    provider = _make_groq_provider()

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": "invalid_api_key"})

    _patch_async_client(monkeypatch, httpx.MockTransport(handler))

    with pytest.raises(AIProviderError):
        await provider.generate(GenerationRequest(prompt="hello"))


def test_groq_provider_requires_api_key(monkeypatch):
    from app.core.config import get_settings
    from app.providers.groq.provider import GroqProvider

    get_settings.cache_clear()
    monkeypatch.setenv("GROQ_API_KEY", "")

    with pytest.raises(AIProviderError):
        GroqProvider()

    get_settings.cache_clear()
