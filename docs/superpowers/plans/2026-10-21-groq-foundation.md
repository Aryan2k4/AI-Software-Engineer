# Groq Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver genuine authenticated Groq generation with safe provider selection, persisted results, explicit failures and reproducible quality evaluation fixtures.

**Architecture:** Keep the existing Next.js endpoints and domain output contract. Extract provider selection and the Groq HTTP adapter into small server-side modules; use injected HTTP transport for deterministic tests. This independently deployable slice precedes durable orchestration, execution workers and repository delivery.

**Tech Stack:** Existing Next.js, TypeScript, Zod, Prisma/PostgreSQL, node:test and Playwright; no additional runtime dependency required.

**Spec:** ../specs/2026-10-21-capstone-design.md

## Global constraints

- No key in logs, browser storage, URLs or client bundles.
- No automatic paid-provider fallback and no billing upgrade.
- No fabricated execution results; structural validation is not test execution.
- Preserve stored OpenAI/Ollama/demo runs and existing account data.
- Keep light/dark UI and server-side authentication checks.
- A configured secret is not a credential health check.

## Review focus

1. Explicit Groq selection with a missing key must not fall through to OpenAI (Task 1).
2. Rate limits and invalid credentials must produce distinct safe errors (Task 2).
3. Truncated, oversized, duplicate-path or malformed model output must never be persisted as success (Task 2).
4. Existing workspace JSON and new Groq runs must both reload correctly (Task 3).
5. Model-generated claims about execution must not become UI verification evidence (Tasks 2 and 4).

## File boundaries

- Create `web/lib/ai/config.ts`: pure provider selection; no browser imports.
- Create `web/lib/ai/groq.ts`: Groq request/response contract and safe errors.
- Modify `web/app/api/run/route.ts`: invoke Groq adapter while preserving auth and request bounds.
- Modify `web/app/api/config/route.ts`: report the same selection as the run route.
- Modify `web/lib/domain.ts`: accept Groq in persisted run mode.
- Modify `web/components/workspace.tsx`: provider/error labels only where needed.
- Create `web/tests/ai-config.test.ts`, `web/tests/groq.test.ts`: transport/config regression tests.
- Modify `web/tests/domain.test.ts`, `web/tests/workspace.spec.ts`: persistence/UI regressions.
- Create `web/tests/fixtures/quality-cases.json`: versioned feature briefs and evaluation criteria.
- Update `web/.env.example` and `README.md`: exact setup and honest operational state.

## Task 1: Deterministic provider selection

**Interfaces:** `resolveProvider(env: Record<string, string | undefined>): { provider: 'groq' | 'openai' | 'ollama' | 'demo'; configured: boolean }`. Explicit recognized AI_PROVIDER wins; absent selection chooses Groq if its key exists, then OpenAI, otherwise demo. Unknown explicit selection is unconfigured demo, never an implicit external call.

- [ ] Write `ai-config.test.ts` assertions for Groq key auto-selection, explicit Groq without key, explicit OpenAI with both keys, explicit Ollama, unknown provider and empty environment. Assert explicit missing Groq key gives `{provider:'groq', configured:false}`.
- [ ] Run `npx tsx --test tests/ai-config.test.ts` from web; require failure before implementation.
- [ ] Implement `resolveProvider` and use it in both endpoints without exposing environment values.
- [ ] Run tests and build; require all assertions and TypeScript checks to pass.
- [ ] Commit this selection change with its tests.

## Task 2: Bounded Groq generation

**Interfaces:** export `GenerationInput = {prompt:string; context:string; files:Array<{path:string;content:string}>}` and `generateGroq(input: GenerationInput, options: {apiKey:string; model:string; fetcher?: typeof fetch}): Promise<Output>`. Export `ProviderError` carrying safe `code` and HTTP `status`, not provider response bodies. HTTP adapter uses official Groq chat completions endpoint and JSON response mode after current documentation verification.

- [ ] Verify supported model IDs, JSON mode, context/output limits and free-plan limits in official Groq docs. Choose one documented model default and record the choice in README; do not infer free-plan status from a key alone.
- [ ] Write mocked-fetch tests asserting Bearer auth, selected model, JSON mode, separated system/user messages and bounded output request. Assert success validates through `outputSchema`.
- [ ] Add tests for 401/403 -> invalid credentials, 429 -> rate limited, 5xx -> unavailable, abort -> timeout, malformed JSON, absent content, token truncation, duplicate paths and oversized response. Assert no raw provider message or secret appears in errors.
- [ ] Run the new tests; confirm failure.
- [ ] Implement `generateGroq` with 90-second timeout and 1 MB streamed response ceiling. Reject token-limit truncation and duplicate paths; reject invalid artifact schema. Do not automatically retry this synchronous slice or switch providers.
- [ ] Prompt for explicit acceptance criteria, concrete implementation and relevant tests, with project text treated as untrusted data. State clearly that the model cannot execute code. Do not add claims of multi-agent validation.
- [ ] Wire the authenticated run endpoint to the adapter. Preserve request-size bounds and same-origin checks; return safe provider status codes and actionable messages.
- [ ] Run all unit tests and build, then commit.

## Task 3: Persistence and UI integration

**Interfaces:** extend existing `Run.mode` with `'groq'`; keep output and workspace schema compatible. API config retains its public shape and reports demo when the selected provider is unconfigured. UI must not silently produce demo output after a live request fails.

- [ ] Add domain test: create a Groq run, apply it, serialize/reparse through workspaceSchema, and assert mode/content unchanged. Reparse fixtures for existing modes.
- [ ] Add browser tests using mocked config/run/workspace responses: live Groq success updates artifacts; 429 shows quota error and creates no run; missing provider configuration visibly identifies demo/unavailable state.
- [ ] Run tests; confirm failures before adding enum and minimal UI changes.
- [ ] Implement schema/UI changes. Preserve user context and avoid changing local storage identifiers.
- [ ] Add `GROQ_API_KEY`, `AI_PROVIDER=groq` guidance and documented `GROQ_MODEL` to env example/README. Explain that no public secret prefix is allowed.
- [ ] Run unit tests, production build and Playwright; commit.

## Task 4: Quality evidence and deployment

**Interfaces:** `quality-cases.json` contains `{id, prompt, context, expectedFiles, acceptanceCriteria}` for six dependency-free Node cases: input validation, filtering, pagination, deduplication, stable sorting and async error handling. Fixtures contain no confidential data. Actual execution-based scoring belongs to the worker slice, not structural validation.

- [ ] Add fixtures and a fixture-schema test: six unique IDs, nonempty criteria, supported execution profile. Commit fixtures and evaluation protocol in README.
- [ ] Define future paired evaluation: same briefs/model/settings for baseline vs plan/implement/test/repair workflow; report observed test pass rate, first-pass success, repair success, tokens and latency. Never report improvements before results exist. Reserve additional held-out cases for final evaluation to reduce prompt overfitting.
- [ ] Confirm Vercel key presence without reading or printing it; set non-secret AI_PROVIDER=groq in Production if missing. Keep billing unchanged.
- [ ] Run `npm test`, `npm run build`, `npx playwright test` with safe local URL overrides where pulled environment exports contain redacted placeholders. Inspect staged diff for secrets; require clean checks.
- [ ] Push the reviewed slice and deploy to Vercel. Check public HTTP response, configured provider and anonymous API denial.
- [ ] Ask the user to sign in only if no authenticated session is available for a tiny non-confidential live request. Report live credential testing as pending until observed successful inference; do not create an unauthenticated inference endpoint to bypass login.

## Subsequent plans and coverage

This slice is not the whole capstone. Subsequent independently reviewed plans cover:

1. Normalized migrations, transactional quotas, durable runs/leases/events, separate plan/implement/review calls, immutable snapshots and approvals.
2. Restricted worker, real tests, test-result-driven repair capped at two attempts, rerunning tests after every patch, cancellation and security boundaries. Preserve failed attempts; a model review cannot override a failed test.
3. Repository access, line diffs, stale-base rejection, branch/PR approval, actual CI/deployment status and expanded accessibility/security evaluation.

No change to unsupported arbitrary-code hosting or always-online guarantees. Full completion remains contingent on actual worker availability and repository account consent.

## Self-review

The first slice covers Groq, its errors, persistence compatibility and deployment verification. All five review-focus cases are assigned tests. Full-scope requirements deliberately remain in named subsequent plans rather than being represented as completed here. Interface types and configuration behavior match across tasks. Execution recommendation: native/in-session, because these tasks share a small provider contract and do not need parallel agents.
