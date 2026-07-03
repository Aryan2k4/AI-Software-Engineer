"""AIProvider abstraction layer — ADR-001.

All AI provider implementations must subclass BaseAIProvider.
This ensures the pipeline is provider-agnostic and testable.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass


@dataclass
class GenerationRequest:
    prompt: str
    system_prompt: str = ""
    temperature: float = 0.7
    max_tokens: int = 8192


@dataclass
class GenerationResponse:
    content: str
    provider: str
    model: str
    input_tokens: int = 0
    output_tokens: int = 0


class BaseAIProvider(ABC):
    """Abstract base for all AI providers."""

    name: str = "base"

    @abstractmethod
    async def generate(self, request: GenerationRequest) -> GenerationResponse:
        """Single-shot generation."""
        ...

    @abstractmethod
    async def stream(self, request: GenerationRequest) -> AsyncIterator[str]:
        """Streaming generation — yields text chunks."""
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """Return True if provider is reachable."""
        ...
