# AI Software Engineer: capstone design

Status: proposed architecture, awaiting user review. This document describes work to build, not functionality already delivered.

## Outcome

A solo developer signs in, creates a project, describes a feature, reviews a generated plan, receives a proposed patch, runs supported tests in a restricted environment, reviews actual results, and explicitly approves delivery. Every action and failure survives page reload. Light/dark neo-brutalist UI remains the visual direction. No decorative controls, fabricated checks, or silent substitution of demo output for real inference.

The first supported execution target is a dependency-free JavaScript/Node project using node:test. Arbitrary frameworks and dependency installation are out of scope for the first complete release. Uploaded or imported projects outside this profile remain inspectable but explicitly unsupported for execution.

## Baseline and gaps

Current app has Next.js route handlers, GitHub OAuth configuration, a single owner-scoped Workspace JSON record, browser demo state, task/file/context views, and OpenAI/Ollama generation. Neon persistence was probed successfully. Groq secret presence has been confirmed, not its validity. There is no Groq adapter, durable run orchestration, isolated execution, repository synchronization or generated-project deployment. These are not considered complete.

## Architecture choice

Recommended: retain Vercel for UI/auth/control APIs and Neon for durable records. Use Groq exclusively for the selected live provider, with no automatic paid fallback. A separately operated worker polls authenticated control APIs for jobs and executes approved test jobs in restricted containers.

Alternatives considered: synchronous serverless inference alone is simpler but cannot supply durable execution; a managed sandbox can reduce worker operations but requires a separate account and potentially billing. Start with an owner-operated Docker worker on a dedicated VM or Docker Desktop VM. Hosting it online later must not change the job protocol. No promise of always-online execution without an online worker.

The public deployment must disable anonymous execution. Initial execution access is restricted to the configured operator account. Other authenticated users can manage projects and generate artifacts within quota, but cannot submit arbitrary code to the operator's machine. Container isolation is defense-in-depth, not a claim of safe public hostile-code hosting.

## Delivery slices

1. Groq integration and reliable authenticated generation: server-only secrets, bounded structured output, explicit errors, tests and deployment.
2. Durable engineering workflow: normalized data, immutable snapshots, run events, plan approval, retries, cancellation, resumable UI and diffs.
3. Restricted execution: worker enrollment, leases, real test logs, cancellation, expiry and adversarial validation.
4. Delivery and portfolio readiness: opt-in repository import/export, reviewed branch/PR creation, observed CI/deployment status, documentation and release evidence.

Each slice has a separate implementation plan and acceptance gate. Infrastructure-dependent slices cannot be declared finished just because their source exists.

## Data model and migration

Introduce Project, Task, ConversationMessage, Run, RunStep, RunEvent, ArtifactSnapshot, ExecutionJob, WorkerCredential, RepositoryConnection and AuditEvent records. All tenant-owned queries derive owner identity from the server session. Foreign keys prevent orphaned records; unique idempotency keys prevent duplicate submissions. Artifacts carry base snapshot and content hashes. Run events have monotonic sequence numbers for incremental polling.

Add versioned Prisma migrations. Preserve existing Workspace records as a rollback source; migrate their projects in an idempotent transaction with a recorded migration version. Test migration with representative existing JSON, including sample data and completed runs. Do not drop the legacy table in the initial release. Do not migrate or delete the old external Supabase database without a separate data-migration request.

## Orchestration

Persist a queued run before making external calls. States: queued, planning, awaiting_plan_approval, implementing, awaiting_test_approval, testing, reviewing, awaiting_change_approval, completed, failed, cancelled. Missing worker availability is an explicit waiting condition, not success. Persist step inputs/outputs before advancing; lease expiry permits recovery. Cancellation invalidates the lease, and late results cannot overwrite terminal state.

Plan, implement and review are separate bounded provider calls. Each step records model, attempt, latency and available usage counts. Review receives the actual diff and test result; it must never infer that tests passed from generated test code. Retries use bounded backoff with jitter; honor provider retry delays, cap attempts at three, and do not retry authentication failures. User-initiated retries create linked attempts rather than erasing evidence.

Initial limits: one active run per owner, ten generation starts per hour per owner, bounded input/output sizes, and configurable deployment-wide ceilings. Enforce limits transactionally in PostgreSQL, not process memory. Quota failures produce actionable messages and do not trigger another paid provider.

## Groq adapter

Read GROQ_API_KEY, AI_PROVIDER=groq and GROQ_MODEL on the server only. Verify a currently supported model and its free-plan limits against official documentation during implementation; make model selection configurable. Validate structured JSON against domain schemas. Distinguish missing configuration, invalid credentials, quota exhaustion, timeouts and malformed model responses without exposing provider bodies or secrets to users.

Provider status distinguishes configured, last request succeeded, and last request failed. A configured secret is not a credential health check. Test adapters through injected HTTP transport; a live smoke test uses a tiny non-confidential prompt after configuration. No key in logs, browser storage, URLs or client bundles.

## Execution boundary

Workers authenticate with revocable hashed tokens scoped to one operator. Claim jobs through the control API with an atomic lease and heartbeat; never give a worker the production database password or model key. Only the approved immutable snapshot is executable. The runner accepts an allowlisted profile, not an arbitrary shell command.

Run Node tests inside a pinned runtime image with no network, no privileges, all capabilities dropped, no-new-privileges, non-root user, read-only root, bounded writable temporary space, CPU/memory/PID/output/time limits. Do not mount the Docker socket, home directory, repository checkout or secrets into the generated-code container. The supervising worker controls Docker outside the container. Validate archive paths, symlinks, file count and bytes before materialization into a unique temporary directory. Cleanup is confined to that directory.

Default execution budget: 30 seconds, 256 MB memory, one CPU, 64 processes, 1 MB captured output. Report exit code, duration, termination reason, test summary and bounded raw logs. A timeout, crash or absent worker is never labeled passing. Do not install generated dependencies or execute package lifecycle scripts. Real test success is evidence of observed behavior, not proof of correctness or security.

## Repository delivery and deployment status

Use separately authorized least-privilege repository access; login alone does not grant write permission. Prefer a GitHub App installation restricted to selected repositories. Keep installation credentials server-side. Import bounded text files with revision hashes; reject binaries, oversized trees and secrets by default. Exclude workflow files and executable hooks from automated writes.

Show a line-level added/removed/changed diff against the imported revision. Explicit user approval is required before creating a branch or PR; never write directly to the default branch or auto-merge. Reject stale-base approval and request a refresh. Record resulting branch, commit and PR identifiers.

Deployment panel displays actual linked CI/deployment statuses and source timestamps. The capstone app itself is deployed to Vercel. Generated applications are delivered through reviewed repository changes; automatic arbitrary-app hosting is outside this release. Label unavailable integrations rather than displaying fictional deployment success.

## UI and accessibility

Keep light/dark themes, sharp borders, restrained accents and dense useful panels. Dashboard metrics derive from persisted runs, tasks and observed test results. Every sidebar item and card navigates to a real view. Provide keyboard navigation, focus management, accessible names, responsive layouts, skeleton/loading states, empty-state actions, and recoverable error messages. Demo is a deliberate separate entry point and never mixes with account data without an explicit import.

## Verification and release gate

- Unit tests: provider parsing/errors, transitions, quotas, diff generation, path rules and cancellation fencing.
- Database integration tests: tenant isolation, migrations, concurrent claims, idempotency, stale updates and rollback preservation.
- Worker tests: passing/failing programs, hangs, excessive output, traversal/symlink rejection, network denial and absence of secrets.
- Browser tests: sign-in boundary, project CRUD, real API-backed persistence, plan approval, diff review, failure recovery, keyboard/mobile/light/dark behavior.
- Live smoke checks: GitHub login, persisted project after reload, successful Groq response, actual worker test job, and approved repository delivery on a dedicated test repository.
- CI: clean install, type checking, tests, production build, dependency review and secret scanning. Document unresolved findings explicitly.
- Release: Docker instructions, environment reference, architecture/decision notes, threat model, screenshots, reproducible demo walkthrough and evidence-based resume bullets.

Completion requires evidence for all supported features above. Disabled or unverified infrastructure is reported as a blocker, not a completed feature. Costs, free-tier quotas, operational uptime and unsupported project types are disclosed in README.

## User participation boundaries

Ask for help only for account consent, GitHub App installation, Docker/worker availability, unavailable credentials, paid-service approval, or design/plan review required by the development workflow. Never ask the user to paste secrets into chat. No billing upgrades or public arbitrary-code execution under the existing blanket authorization.
