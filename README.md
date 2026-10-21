# AI Software Engineer

A neo-brutalist engineering workspace built with Next.js, TypeScript, Prisma and PostgreSQL. Organize feature requests, generate code artifacts, inspect changes, and retain project context in light or dark mode.

[Live workspace](https://ai-software-engineer-rho.vercel.app)

## Features

- Project dashboard and distinct project workspaces.
- GitHub sign-in through NextAuth; account-scoped PostgreSQL persistence with optimistic revision checks.
- Task board, file explorer, downloads, change explanations, saved context and run history.
- Server-side Groq, OpenAI or Ollama generation with bounded, schema-validated inputs and outputs.
- Explicitly labeled browser-local demo when live generation is unavailable.

Production uses Neon (managed PostgreSQL) and Vercel. Supabase is not a dependency. Data in the previous Supabase service is not automatically migrated or deleted.

## Honest boundaries

Generation uses one model request followed by artifact validation. The timeline is not independent autonomous workers. Checks validate artifact structure, not generated program correctness. This version does **not** execute generated code, run its tests, synchronize repositories, or deploy generated applications. Live AI generation requires a configured provider and authenticated account; database setup alone does not enable it.

## Local setup

Use Node.js 22+ and Docker for local PostgreSQL.

```sh
cd web
npm ci
cp .env.example .env
cd ..
docker compose up -d db
cd web
npm run db:push
npm run dev
```

On PowerShell, use `Copy-Item .env.example .env`. Open http://localhost:3000. Without credentials, use the labeled local demo.

For account mode configure `DATABASE_URL`, `GITHUB_ID`, `GITHUB_SECRET`, `NEXTAUTH_SECRET` and `NEXTAUTH_URL`. Register a GitHub OAuth app with callback `http://localhost:3000/api/auth/callback/github`. Use a cryptographically random secret; never commit credentials.

For live generation set `OPENAI_API_KEY` and optionally `OPENAI_MODEL`. Alternatively set `AI_PROVIDER=ollama`, `OLLAMA_BASE_URL` and `OLLAMA_MODEL` to a server reachable from Next.js. Localhost on Vercel is not your laptop. Model inference and hosting may incur charges even with a free-tier database.

## Vercel deployment

### Groq (recommended hosted setup)

Set `AI_PROVIDER=groq`, `GROQ_API_KEY` as a Production secret, and optionally `GROQ_MODEL=openai/gpt-oss-120b`. The model is served by **Groq**; it does not require an OpenAI key. The selected default appears in [Groq's free-plan limits](https://console.groq.com/docs/rate-limits); your account quotas and billing status still determine availability/cost. No automatic provider fallback or billing upgrade is performed. Redeploy after changing variables.

The adapter requests JSON output, validates the artifact schema, rejects truncated/duplicate/empty artifacts, bounds response size and time, and reports quota/credential failures separately. These checks improve reliability, not proof of code correctness. Model context and generated code are sent to the selected hosted provider. Do not submit secrets.

Quality evaluation fixtures live in `web/tests/fixtures/quality-cases.json`. Compare the same six briefs/model/settings before and after workflow changes, recording first-pass test success, repair success, token usage and latency. Execution-based scores and accuracy improvements are **not yet measured**; they require the isolated worker. Use additional held-out tasks for final evaluation.

1. Import this repository with **Root Directory: web** and the Next.js preset.
2. Connect Neon PostgreSQL and supply `DATABASE_URL`.
3. Apply the Prisma schema from web using `npm run db:push` against the intended database. Review changes before applying to existing data; adopt versioned migrations for future production schema evolution.
4. Add the authentication and model variables above to Production.
5. Set `NEXTAUTH_URL` to the public URL and the GitHub callback to `<public-url>/api/auth/callback/github`.
6. Redeploy after changing environment variables. Sign in, save context, reload, and verify persistence. Submit a small request to verify model credentials.

The `/api/config` endpoint reports configured modes, not end-to-end credential health. GitHub Pages cannot host these server routes.

## Docker

The root `docker-compose.yml` runs PostgreSQL and standalone Next.js. Create web/.env, start the database and apply the schema as above, then run `docker compose up --build web`. Runtime startup does not automatically apply schema changes. Default database credentials are local-development only.

## Verification

From web:

```sh
npm test
npm run build
npx playwright install chromium
npx playwright test
```

GitHub Actions runs domain tests, production compilation/type checks and browser tests. Browser coverage includes navigation, local generation, task/context persistence and anonymous API denial; it does not validate production OAuth or model credentials.

## Structure

- `web/app`: application entry points and authenticated API routes.
- `web/components`: workspace and customized UI primitives.
- `web/lib`: domain validation, auth, database and request helpers.
- `web/prisma`: PostgreSQL schema.
- `web/tests`: domain and browser tests.
- `.github/workflows/next-workspace.yml`: CI.

Obsolete Vite/FastAPI sources, Supabase schema, old workflows and design notes were removed. They remain recoverable in Git history.

## Remaining work

Isolated code execution, real generated-code tests, durable rate-limited jobs, normalized run persistence, incremental diffs, repository synchronization and deployment integrations. Present this as an AI-assisted engineering workspace, not a completed autonomous software engineer.
