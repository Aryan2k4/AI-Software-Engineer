# Execution ledger: 2026-10-21-groq-foundation

- Preflight: config selection is shared by config and run endpoints; persisted Run.mode must include groq. No conflicting interfaces.
- Ruling: continue in the existing checkout under the user's authorization to update/push/deploy this repository; preserve unrelated files.
- Ruling: use this tracked ledger rather than shell-specific skill helper scripts on Windows, so verification evidence survives handoff.
- Task 1: started; baseline domain suite checked before changes.
- Tasks 1-3: watched missing module and Groq schema tests fail, then 20 unit tests pass after implementation. Build check running.
- Ruling: default to openai/gpt-oss-120b on Groq, not the initially considered Llama model: current official free-plan table lists GPT-OSS, while Llama is marked Enterprise. Model availability remains account-specific; never fall back automatically.
- Task 3: all four browser tests passed, including mocked live Groq success persistence and quota failure without demo substitution. Existing UI already supports dynamic provider names, so no UI code change was necessary.
- Review: independent reviewer found no blocking issues. Extended workspace roundtrip assertions as requested.
- Final: minor (deferred): JSON-null provider envelopes are safely rejected but classified as unavailable rather than invalid output; no artifacts are accepted.
- Ruling: grouped closely coupled config/adapter/schema changes in one commit to avoid shipping a Groq selector before its adapter; unit red/green evidence remains separate.
- Final verification: 21 unit tests passed; production build passed; four browser tests passed. Quality fixtures are ready, but no accuracy score is claimed.
- Infrastructure check: Docker CLI exists, but Docker Desktop Linux engine is not running. Execution-worker live verification will require starting it or supplying another isolated host.
- Task 4: Production provider selection set to groq without reading the saved secret; publishing next. Authenticated live inference remains to be verified.
