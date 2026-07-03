# ADR-001: AI Provider Abstraction Layer

**Status:** Accepted  
**Date:** 2026-01-01

## Context

The system requires an AI backend for the 7-stage blueprint generation pipeline. We need the ability to swap providers (Gemini, Grok, OpenRouter) without modifying business logic, and to run tests deterministically without hitting real AI APIs.

## Decision

Introduce a `BaseAIProvider` abstract class with three methods:
- `generate(request) → GenerationResponse`
- `stream(request) → AsyncIterator[str]`
- `health_check() → bool`

Provider selection is handled by a factory function (`get_ai_provider`) driven by the `AI_PROVIDER` environment variable. A `MockProvider` serves as the test double.

## Consequences

- All pipeline logic depends only on `BaseAIProvider` — zero provider coupling.
- Tests run entirely on `MockProvider`, are deterministic and instant.
- Adding a new provider requires only implementing `BaseAIProvider`.
- Grok and OpenRouter stubs exist but are marked not-yet-implemented.
