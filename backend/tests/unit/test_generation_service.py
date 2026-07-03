"""Unit tests for GenerationService with MockProvider."""
import pytest

from app.providers.mock.provider import MockProvider
from app.services.generation_service import GenerationService


@pytest.mark.asyncio
async def test_generation_returns_all_9_sections():
    svc = GenerationService(MockProvider())
    sections = await svc.run("A SaaS app for task management")
    assert sections.idea_clarification is not None
    assert sections.tech_stack is not None
    assert sections.architecture is not None
    assert sections.database_schema is not None
    assert sections.api_design is not None
    assert sections.implementation_roadmap is not None
    assert sections.security_deployment is not None
    assert sections.testing_strategy is not None
    assert sections.documentation is not None


@pytest.mark.asyncio
async def test_generation_stage_callback_fires():
    svc = GenerationService(MockProvider())
    stages_fired: list[int] = []

    async def on_stage(stage: int, content: str) -> None:
        stages_fired.append(stage)

    await svc.run("Build a blog platform", on_stage_complete=on_stage)
    assert stages_fired == [1, 2, 3, 4, 5, 6, 7]


@pytest.mark.asyncio
async def test_mock_provider_health_check():
    provider = MockProvider()
    assert await provider.health_check() is True


@pytest.mark.asyncio
async def test_mock_provider_generate():
    from app.providers.base import GenerationRequest
    provider = MockProvider()
    resp = await provider.generate(GenerationRequest(prompt="test"))
    assert resp.provider == "mock"
    assert len(resp.content) > 0
