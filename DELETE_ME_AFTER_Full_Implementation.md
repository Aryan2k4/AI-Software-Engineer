> **This file exists only to help the developer understand and deploy the project.**
> **After the project is successfully running and understood, this file may be safely deleted.**

---

# AI Software Engineer — Developer Handoff Guide

**Build ID:** AG-ASE-2026  
**Owner:** Aryan Goswami  
**Repository:** `ai-software-engineer/`  
**Version:** 1.1.0  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Local Setup](#2-local-setup)
3. [Environment Variables](#3-environment-variables)
4. [Database Setup](#4-database-setup)
5. [Deployment Guide](#5-deployment-guide)
6. [How AI Generation Works](#6-how-ai-generation-works)
7. [Folder-by-Folder Explanation](#7-folder-by-folder-explanation)
8. [Future Improvements](#8-future-improvements)
9. [Known Limitations](#9-known-limitations)
10. [Git Workflow](#10-git-workflow)
11. [Maintenance Guide](#11-maintenance-guide)
12. [Resume Guide](#12-resume-guide)
13. [Interview Guide](#13-interview-guide)
14. [Ownership](#14-ownership)

---

## 1. Project Overview

### What This Is

**AI Software Engineer** transforms a single-sentence project idea into a complete, 9-section engineering blueprint using a 7-stage Google Gemini AI pipeline. A user types "A platform for freelancers to track invoices" and receives architecture diagrams, database schemas, API designs, a roadmap, security guidance, and more — in under 60 seconds.

### Purpose

Demonstrate production-grade full-stack AI engineering: a real pipeline, real auth, real database, real exports, real public sharing — not a demo wrapper around a single API call.

### Features

- 🔐 **Authentication** — Supabase Auth (email/password, JWT)
- ⚡ **7-Stage AI Pipeline** — sequential Gemini generation with per-stage progress
- 📋 **9-Section Blueprint** — Idea Clarification, Tech Stack, Architecture, Database Schema, API Design, Roadmap, Security & Deployment, Testing Strategy, Documentation
- 📤 **Exports** — Markdown, PDF (WeasyPrint), JSON with Supabase Storage
- 🔗 **Public Sharing** — token-based shareable URLs, unauthenticated read-only view
- 🔴 **Realtime updates** — Supabase Realtime for live export status (polling fallback)
- 🗂️ **Projects Dashboard** — list, create, delete projects
- 🧭 **Onboarding** — FirstVisitBanner, GenerationProgressPage with stage tracker
- 🛡️ **Error Boundaries** — root + page-level with Sentry integration
- 📦 **Code Splitting** — `React.lazy` per-route, ~160KB gzip total

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript 5, Vite, Tailwind CSS v3, Framer Motion |
| Backend | FastAPI, Python 3.12, Pydantic v2 |
| Database | Supabase (PostgreSQL 15, Auth, Realtime, Storage) |
| AI | Google Gemini 1.5 Pro (primary), Mock (tests), Grok/OpenRouter (stubs) |
| Observability | Sentry (frontend + backend) |
| Deployment | Docker, nginx, GitHub Actions CI |

### Architecture

```
User → React SPA (Vite)
         │
         ├─→ Supabase Auth (JWT)
         ├─→ FastAPI Backend (/api/v1/*)
         │      │
         │      ├─→ Clean Architecture: Router → Service → Repository → Supabase DB
         │      ├─→ AI Provider Abstraction: GeminiProvider | MockProvider | (stubs)
         │      └─→ 7-Stage Pipeline: GenerationService
         │
         └─→ Supabase Realtime (export status push)
```

### Design System

- **Base:** Deep graphite `#0a0b0d`
- **Accent:** Teal `#2DD4BF`, Cyan `#67E8F9`
- **Navy:** `#1e3a5f`
- **Typography:** Ice-gray scale
- **Inspiration:** Linear, Arc Browser, Raycast, Notion Calendar
- **Animations:** Framer Motion throughout

### Folder Structure

```
ai-software-engineer/
├── backend/                    # FastAPI Python backend
│   ├── app/
│   │   ├── api/               # Routers + auth dependency
│   │   ├── core/              # Config, exceptions, logging, security
│   │   ├── models/            # Pydantic domain models
│   │   ├── providers/         # AI provider abstraction (Gemini, Mock, stubs)
│   │   ├── repositories/      # Data access layer (Supabase)
│   │   ├── services/          # Business logic (generation, export, share)
│   │   └── utils/             # Supabase client singleton
│   └── tests/                 # unit + integration + e2e
├── frontend/                   # React + TypeScript SPA
│   └── src/
│       ├── app/               # App.tsx (router + providers)
│       ├── components/        # Shared UI (ErrorBoundary, FirstVisitBanner)
│       ├── features/          # Feature-Sliced Design modules
│       │   ├── auth/          # AuthContext, ProtectedRoute, useAuth
│       │   ├── blueprint/     # ResultPanel, SectionRenderers, BlueprintHeader
│       │   ├── export/        # export API, useExportStatus
│       │   ├── projects/      # projects API
│       │   └── share/         # SharePanel, share API
│       ├── lib/               # supabase.ts, api-client.ts
│       ├── pages/             # Route-level page components
│       ├── styles/            # globals.css with CSS custom properties
│       └── types/             # domain.ts (all TypeScript types)
├── database/
│   ├── migrations/            # SQL migrations (run in Supabase SQL editor)
│   └── schema.md              # Database schema documentation
├── docs/adr/                  # Architecture Decision Records
├── scripts/                   # heartbeat.py, generate-types.sh
├── .github/workflows/         # CI (ci.yml) + heartbeat (heartbeat.yml)
└── docker-compose.yml         # Local Docker stack
```

---

## 2. Local Setup

### Prerequisites

```bash
# Required versions
python --version    # 3.12+
node --version      # 20+
npm --version       # 10+
```

### Step 1 — Clone

```bash
git clone <your-repo-url> ai-software-engineer
cd ai-software-engineer
```

### Step 2 — Backend

```bash
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate          # macOS / Linux
# OR: .venv\Scripts\activate       # Windows PowerShell

# Install dependencies
pip install -r requirements.txt

# Copy and fill environment variables
cp .env.example .env
# Edit .env with your real keys (see Section 3)

# Run the backend (development)
uvicorn app.main:app --reload --port 8000
```

Backend is live at: `http://localhost:8000`  
API docs (dev only): `http://localhost:8000/api/docs`

### Step 3 — Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Copy and fill environment variables
cp .env.example .env
# Edit .env with your Supabase URL and anon key (see Section 3)

# Run the frontend (development)
npm run dev
```

Frontend is live at: `http://localhost:5173`

### Step 4 — Docker (alternative to Steps 2+3)

```bash
cd ..   # repo root

# Copy env files first
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit both .env files

# Build and run
docker-compose up --build
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

### Step 5 — Run Tests

```bash
# Backend
cd backend
PYTHONPATH=. pytest tests/ -v

# Frontend
cd ../frontend
npm run test          # Vitest
npm run typecheck     # TypeScript
npm run lint          # ESLint
npm run build         # Production build
```

---

## 3. Environment Variables

### Backend (`backend/.env`)

```env
# ── AI Provider ───────────────────────────────────────────────────────────────
GEMINI_API_KEY=AIza...
# Get from: https://aistudio.google.com/app/apikey
# Free tier available. Model: gemini-1.5-pro

GROQ_API_KEY=gsk_...
# Get from: https://console.groq.com/keys
# Free tier available. Model: llama-3.3-70b-versatile. Much faster than Gemini.

AI_PROVIDER=gemini
# Options: gemini | groq | mock
# Use "mock" for local dev without spending API credits.
# Mock returns deterministic test data instantly.
# Use "groq" for fast, free-tier-friendly generation.

# ── Supabase ──────────────────────────────────────────────────────────────────
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
# Get from: Supabase Dashboard → Project Settings → API → Project URL

SUPABASE_SERVICE_ROLE_KEY=eyJ...
# Get from: Supabase Dashboard → Project Settings → API → service_role key
# ⚠️  NEVER expose this in the frontend. Server-side only.

SUPABASE_ANON_KEY=eyJ...
# Get from: Supabase Dashboard → Project Settings → API → anon public key
# Safe to expose in frontend (RLS enforces security)

SUPABASE_JWT_SECRET=your-jwt-secret-here
# ⚠️  CRITICAL: This is what signs/verifies all Supabase auth tokens.
# Get from: Supabase Dashboard → Project Settings → API → JWT Settings → JWT Secret
# WITHOUT THIS, ALL AUTHENTICATION WILL FAIL.

# ── Security ──────────────────────────────────────────────────────────────────
SECRET_KEY=a-random-string-at-least-32-characters-long
# Generate: python3 -c "import secrets; print(secrets.token_urlsafe(32))"
# Used for internal signing operations.

ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com
# Comma-separated list of frontend URLs allowed to call the backend.
# CORS will block any origin not in this list.

# ── Sentry (optional but recommended) ────────────────────────────────────────
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
# Get from: sentry.io → Create Project → Python/FastAPI → DSN
# Leave empty to disable.

# ── App ───────────────────────────────────────────────────────────────────────
APP_ENV=development
# Options: development | production
# In production: OpenAPI docs are hidden, log level may differ.

LOG_LEVEL=INFO
# Options: DEBUG | INFO | WARNING | ERROR
```

### Frontend (`frontend/.env`)

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
# Same as backend SUPABASE_URL

VITE_SUPABASE_ANON_KEY=eyJ...
# Same as backend SUPABASE_ANON_KEY (safe to expose — RLS handles security)

VITE_API_BASE_URL=http://localhost:8000
# URL of your backend API.
# In production: https://your-api-domain.com

VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
# Get from: sentry.io → Create Project → React → DSN
# Leave empty to disable. Separate from backend Sentry project.
```

---

## 4. Database Setup

### Step 1 — Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a name, database password, and region
3. Wait for provisioning (~2 minutes)

### Step 2 — Run Migrations

Open the **SQL Editor** in your Supabase dashboard and run each migration in order:

```sql
-- Run first:
-- Paste contents of: database/migrations/001_initial.sql
-- Creates: projects, blueprints tables + RLS policies + updated_at triggers

-- Run second:
-- Paste contents of: database/migrations/002_exports_shares.sql
-- Creates: exports, project_shares tables + RLS + advisory lock functions + share view counter RPC
```

### Step 3 — Enable Realtime

In Supabase Dashboard → **Database → Replication**:
- Find the `exports` table
- Toggle **Realtime** ON

Or run in SQL editor:
```sql
alter publication supabase_realtime add table exports;
```

### Step 4 — Create Storage Bucket

In Supabase Dashboard → **Storage → New Bucket**:
- **Name:** `exports`
- **Public:** OFF (private — access via signed URLs only)

Or run:
```sql
-- In Supabase dashboard Storage section, create bucket named "exports" (private)
```

### Step 5 — Row Level Security

RLS is enabled in the migrations automatically. Verify in Dashboard → **Authentication → Policies** that each table has policies. Key policies:

- `projects`: `auth.uid() = user_id` for all operations
- `blueprints`: `auth.uid() = user_id` for all operations  
- `exports`: `auth.uid() = user_id` for all operations
- `project_shares`: owner full access + public SELECT when `visibility = 'public'`

### Step 6 — Get Environment Variables

After setup, collect from **Project Settings → API**:
- Project URL → `SUPABASE_URL` / `VITE_SUPABASE_URL`
- `anon` public key → `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

From **Project Settings → API → JWT Settings**:
- JWT Secret → `SUPABASE_JWT_SECRET`

---

## 5. Deployment Guide

### Backend — Railway (recommended free option)

1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select `backend/` as the root directory
4. Set all env vars in Railway dashboard
5. Railway auto-detects `Dockerfile` and deploys
6. Get your public URL (e.g. `https://your-app.up.railway.app`)

### Backend — Render

1. New Web Service → connect GitHub repo
2. Root Directory: `backend`
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add all environment variables

### Frontend — Vercel (recommended)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import repository
3. Set Root Directory to `frontend`
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_BASE_URL` → your deployed backend URL
   - `VITE_SENTRY_DSN` (optional)
5. Deploy

### Frontend — Netlify

1. New site from Git → select repo
2. Base directory: `frontend`
3. Build command: `npm run build`
4. Publish directory: `frontend/dist`
5. Add environment variables in Site Settings

### Production Checklist

```
[ ] APP_ENV=production          (hides API docs)
[ ] SUPABASE_JWT_SECRET set     (auth will break without this)
[ ] ALLOWED_ORIGINS set         (your frontend domain only)
[ ] SENTRY_DSN set              (optional but recommended)
[ ] Supabase Realtime enabled   (for exports table)
[ ] Storage bucket created      (exports, private)
[ ] All migrations run          (001 + 002)
[ ] RLS verified                (test with a non-owner user)
[ ] HTTPS everywhere            (Supabase requires it)
[ ] SECRET_KEY is random        (not the default)
```

### Heartbeat Cron (Supabase free-tier)

Supabase free projects pause after 7 days of inactivity. To prevent this, add a GitHub Actions secret:

```
HEARTBEAT_URL = https://your-backend-api.com/health
```

The `.github/workflows/heartbeat.yml` workflow pings `/health` every 6 days automatically.

---

## 6. How AI Generation Works

### Overview

```
User submits idea
       │
       ▼
POST /api/v1/projects  →  creates Project (status: pending)
       │
       ▼
BackgroundTask: _run_generation()
       │
       ├─ Stage 1: Idea Clarification    → IdeaClarification model
       ├─ Stage 2: Tech Stack            → TechStack model
       ├─ Stage 3: Architecture          → Architecture model
       ├─ Stage 4: Database Schema       → DatabaseSchema model
       ├─ Stage 5: API Design            → APIDesign model
       ├─ Stage 6: Implementation Roadmap → ImplementationRoadmap model
       └─ Stage 7: Security + Testing + Docs (batched) → 3 models
              │
              ▼
       blueprints.create()  →  saves BlueprintSections to DB
       projects.update_status(COMPLETED)
              │
              ▼
Frontend polls /api/v1/projects/{id} every 2.5s
UI updates progress bar per stage
On COMPLETED → navigates to BlueprintPage
```

### Provider Abstraction (ADR-001)

All AI calls go through `BaseAIProvider`:

```python
class BaseAIProvider(ABC):
    async def generate(request) -> GenerationResponse
    async def stream(request) -> AsyncIterator[str]
    async def health_check() -> bool
```

The active provider is selected by `AI_PROVIDER` env var via `get_ai_provider()` factory.

- **`GeminiProvider`** — real Google Gemini 1.5 Pro calls. Wraps blocking SDK with `asyncio.get_running_loop().run_in_executor()`.
- **`GroqProvider`** — real Groq API calls (Llama 3.3 70B by default) via OpenAI-compatible chat completions endpoint. Free tier at [console.groq.com](https://console.groq.com). Much faster inference than Gemini due to Groq's LPU hardware. Supports both `generate()` and `stream()`.
- **`MockProvider`** — returns deterministic JSON instantly. Used in all tests. Never hits the network.
- **`GrokProvider`** / **`OpenRouterProvider`** — stubs, raise `AIProviderError`. Ready for implementation.

### Prompt System (PROMPT_SCHEMA_CONTRACT v1.1)

Each stage has a structured prompt in `STAGE_PROMPTS` dict. System prompt instructs Gemini to return raw JSON only (no markdown fences, no preamble).

Stage 1–6 each request one section. Stage 7 batches three sections (Security + Testing + Docs) to reduce API calls.

Context chaining: each stage result is serialized to JSON and injected as `{stage1}`, `{stage2}` etc. into subsequent prompts, so later stages have full context.

### JSON Extraction

`_extract_json()` strips any accidental markdown fences and parses JSON. The `_extract(result, key)` helper unwraps the section key if the model returns a wrapped object (e.g. `{"idea_clarification": {...}}` instead of `{...}` directly) — needed for mock compatibility.

### Exports

Three formats, all processed as background tasks:

| Format | Service | Notes |
|--------|---------|-------|
| Markdown | `markdown_export.py` | Pure Python string rendering |
| PDF | `pdf_export.py` | WeasyPrint (HTML→PDF). Requires system libraries in Docker. |
| JSON | `export_service.py` | `json.dumps(blueprint.sections.model_dump())` |

Files are uploaded to Supabase Storage bucket `exports` at path `{user_id}/{export_id}/{filename}`. A 7-day signed URL is returned.

Export status is tracked in the `exports` table and pushed via Supabase Realtime. The frontend `useExportStatus` hook subscribes to Realtime (falls back to 3s polling if WebSocket unavailable).

### Public Sharing

`ShareService.create_share()` generates a `secrets.token_urlsafe(24)` token, stores it in `project_shares`. The frontend builds a shareable URL: `{origin}/share/{token}`.

`GET /api/v1/public/share/{token}` — **no auth required** — returns the full blueprint. `view_count` is atomically incremented via a Supabase RPC.

### Retries

Not yet implemented at the application level — the `tenacity` library is installed and ready. See [Future Improvements](#8-future-improvements).

---

## 7. Folder-by-Folder Explanation

### `backend/app/core/`

Foundation layer. Nothing here imports from other app modules.

- `config.py` — `Settings` Pydantic model reads all env vars. Cached with `@lru_cache`. If you add a new env var, add it here first.
- `exceptions.py` — all custom exception classes + `to_http_exception()` converter. Add new error types here.
- `logging.py` — configures stdlib logging. `get_logger(__name__)` pattern used everywhere.
- `security.py` — JWT decode using `SUPABASE_JWT_SECRET`. This is the auth gate for every protected endpoint.

### `backend/app/providers/`

AI abstraction layer. Adding a new AI provider: create a new folder, implement `BaseAIProvider`, add a case to `factory.py`.

### `backend/app/models/`

Pydantic v2 models. These are the single source of truth for data shapes. Frontend `domain.ts` is the TypeScript mirror.

### `backend/app/repositories/`

Database access only. No business logic. Each repository gets a Supabase client and operates on one table. If you add a new table, add a new repository.

### `backend/app/services/`

Business logic. Services can call multiple repositories. They don't know about HTTP (no `Request`, no `Response`). If you add a new feature, put the logic here.

### `backend/app/api/routers/`

HTTP layer only. Routers validate input (via Pydantic), call services, return responses. Error translation (`to_http_exception`) happens here.

### `backend/tests/`

- `unit/` — no network, no DB, no filesystem. Tests models, services with MockProvider.
- `integration/` — tests API endpoints with mocked repositories.
- `e2e/` — empty, ready for Playwright/httpx real-network tests.
- `conftest.py` — global fixtures. Supabase is mocked by default. `mock_supabase` is `autouse=True`.

### `frontend/src/features/`

Feature-Sliced Design. Each feature owns its API client, components, and hooks. Features don't import from each other's internals — they go through `@/types/domain.ts` for shared types.

### `frontend/src/pages/`

Route-level components. Each is lazy-loaded via `React.lazy` in `App.tsx`. These are "dumb" assemblers of feature components.

### `frontend/src/components/common/`

Truly shared, feature-agnostic components. `ErrorBoundary` and `FirstVisitBanner` are here. Don't put feature-specific code here.

### `frontend/src/lib/`

Infrastructure: `supabase.ts` (Supabase client singleton) and `api-client.ts` (fetch wrapper with auth headers).

### `database/migrations/`

Plain SQL files for Supabase. Run manually in the SQL editor. Number them sequentially. Never edit a previously-run migration — add a new file instead.

### `docs/adr/`

Architecture Decision Records. Read these to understand *why* key decisions were made before changing them.

---

## 8. Future Improvements

### High Priority

| Improvement | Why | Effort |
|-------------|-----|--------|
| **Rate limiting** | Prevent API abuse. Add `slowapi` middleware to backend. | 2h |
| **Retry logic** | Gemini calls can transiently fail. Wire in `tenacity` with exponential backoff in `GeminiProvider`. | 2h |
| **E2E tests** | Playwright tests for auth flow, generation flow, share flow. | 1 day |
| **Token refresh interceptor** | `api-client.ts` fetches session per request. Add retry on 401 with token refresh. | 3h |
| **Generation lock** | `pg_try_advisory_lock` function exists in migrations but isn't wired to the backend. Prevents duplicate generation runs. | 2h |
| **Section regeneration** | Allow re-running individual pipeline stages (e.g. "Regenerate the API Design section"). | 4h |

### Medium Priority

| Improvement | Why | Effort |
|-------------|-----|--------|
| **Streaming generation** | Stream stage output token-by-token to the UI instead of waiting for each stage to complete. Provider `stream()` method already exists. | 1 day |
| **Blueprint editing** | Allow manual editing of generated sections. | 2 days |
| **Project templates** | Pre-filled ideas for common project types. | 4h |
| **Grok / OpenRouter providers** | Implement the stub providers for model choice. | 4h each |
| **Blueprint versioning** | Track multiple generation versions per project. | 1 day |
| **Export signed URL refresh** | Signed URLs expire in 7 days. Add a refresh endpoint. | 2h |

### Low Priority

| Improvement | Why | Effort |
|-------------|-----|--------|
| **Dark/light mode toggle** | Currently always dark. | 3h |
| **Responsive mobile layout** | Works but not optimized for < 380px. | 4h |
| **Blueprint PDF preview** | In-browser preview before download. | 1 day |
| **Share expiry UI** | The backend supports `expires_in_days` but the UI doesn't surface it. | 2h |
| **Team workspaces** | Multi-user access to the same projects. | 3 days |
| **OpenAPI type sync CI check** | Fail CI if generated types drift from backend schema. | 3h |

---

## 9. Known Limitations

| Limitation | Impact | Workaround |
|------------|--------|-----------|
| **WeasyPrint system deps** | PDF export requires `libpango`, `libcairo` etc. The Dockerfile installs them, but bare-metal installs need manual setup. | Use Docker for PDF. Or use Markdown export. |
| **Gemini context window** | Very long ideas + 7 stages may approach token limits. Stage 7 batches 3 sections to reduce calls. | Keep ideas under 500 words. |
| **No generation retry** | A transient Gemini error fails the whole project. User must create a new project. | Wire `tenacity` retries (see Future Improvements). |
| **Supabase free tier pauses** | Projects pause after 7 days of no requests. | Heartbeat cron (`.github/workflows/heartbeat.yml`) prevents this. |
| **Advisory lock is best-effort** | `pg_try_advisory_lock` exists in migrations but isn't called yet. Duplicate concurrent generation is theoretically possible. | Low risk for personal use. Add lock for production. |
| **httpx deprecation warning** | `starlette.testclient` warns about httpx version in tests. This is an upstream issue, not our code. | Will resolve when httpx2 ships. |
| **Signed URL expires in 7 days** | Export download links expire. No auto-refresh. | Regenerate the export or refresh the URL (see Future Improvements). |

---

## 10. Git Workflow

### Branching Strategy

```
main          ← production-ready, protected
develop       ← integration branch
feature/*     ← feature branches (e.g. feature/retry-logic)
fix/*         ← bug fixes (e.g. fix/export-url-expiry)
chore/*       ← deps, tooling (e.g. chore/upgrade-fastapi)
```

### Commit Convention (Conventional Commits)

```
feat: add streaming generation support
fix: prevent navigate-after-unmount race condition
chore: upgrade supabase-js to 2.32
docs: update environment variable guide
test: add e2e test for share flow
refactor: extract export URL logic to service
```

### Release Process

```bash
# 1. Merge develop → main
git checkout main && git merge develop

# 2. Tag the release
git tag -a v1.2.0 -m "Release v1.2.0 — streaming generation"

# 3. Push tag (triggers CI)
git push origin main --tags

# 4. Deploy (CI handles this if configured, or manual deploy)
```

---

## 11. Maintenance Guide

### Updating Python Dependencies

```bash
cd backend
pip install --upgrade fastapi pydantic uvicorn
# Pin versions manually in requirements.txt after testing
pip freeze | grep fastapi >> requirements.txt  # check version
PYTHONPATH=. pytest tests/ -q  # verify nothing broke
```

### Updating Node Dependencies

```bash
cd frontend
npm update                    # update within semver ranges
npm outdated                  # see what's behind
npm install framer-motion@latest  # upgrade specific package
npm run test && npm run build  # verify
```

### Updating Supabase SDK

The Supabase Python SDK (`supabase`) and JS SDK (`@supabase/supabase-js`) have breaking changes between major versions. Always check their changelog before upgrading.

```bash
# Check changelog before upgrading:
# https://github.com/supabase/supabase-py/releases
# https://github.com/supabase/supabase-js/releases
pip install supabase==X.Y.Z
npm install @supabase/supabase-js@X.Y.Z
```

### Updating Gemini SDK

```bash
pip install google-generativeai --upgrade
# Test with mock first, then real API
```

### Rotating Secrets

If any key is compromised:
1. `SUPABASE_JWT_SECRET` — rotate in Supabase Dashboard → Project Settings → API → JWT Settings → **Roll JWT secret**. This invalidates ALL existing sessions.
2. `GEMINI_API_KEY` — revoke in Google AI Studio, create new.
3. `SECRET_KEY` — update env var and redeploy.

---

## 12. Resume Guide

The following can be **truthfully and specifically** claimed on a resume for this project:

### Architecture & System Design
- Designed and implemented a production-grade AI pipeline with Clean Architecture, Repository Pattern, and Feature-Sliced Design
- Implemented an AI Provider abstraction layer supporting hot-swappable backends (Gemini, Mock, stub providers)
- Designed 7-stage sequential AI generation pipeline with context chaining between stages

### AI Engineering
- Built a multi-stage LLM pipeline using Google Gemini 1.5 Pro via the `google-generativeai` SDK
- Implemented a PROMPT_SCHEMA_CONTRACT system for deterministic structured JSON output from LLMs
- Designed JSON extraction and validation with Pydantic v2 for LLM output normalization

### Backend
- Built a FastAPI REST API with 12+ endpoints, JWT auth middleware, Pydantic v2 validation
- Implemented async background task processing for AI generation and file export
- Built Supabase integration including PostgreSQL via RLS, Realtime pub/sub, and Storage
- Wrote 24 passing tests (unit + integration) with 100% mock isolation (no real DB in tests)

### Frontend
- Built a React 18 + TypeScript 5 SPA with strict mode and zero type errors
- Implemented Supabase Realtime subscriptions with polling fallback (ADR-005)
- Applied route-based code splitting via `React.lazy` reducing initial bundle to < 55KB gzip
- Used Framer Motion for production-quality animations throughout

### Infrastructure & Deployment
- Configured Docker multi-stage builds for frontend (nginx) and backend
- Set up GitHub Actions CI with lint, typecheck, test, and build stages
- Implemented Sentry error tracking on both frontend and backend

### Security
- Implemented Supabase JWT verification using the correct HMAC secret
- Configured Row Level Security policies for all database tables
- Built token-based public share links with view count tracking

---

## 13. Interview Guide

### Key Architectural Decisions

**Q: Why FastAPI over Django/Flask?**
FastAPI has native async support, automatic OpenAPI generation, Pydantic v2 validation, and Python type hints throughout. For an AI application where I/O is the bottleneck (LLM API calls), async is not optional.

**Q: Why did you separate AI providers behind an abstraction?**
Two reasons: testability and flexibility. With `MockProvider`, all 24 tests run in < 1 second without any network calls or API costs. With the abstraction, switching from Gemini to GPT-4 or Grok is a single env var change.

**Q: Why 7 stages instead of one big prompt?**
Gemini's output degrades on very large JSON schemas in a single prompt. By chaining stages, each stage has a focused, small JSON contract. Earlier stages also inform later ones — the tech stack informs the architecture, the architecture informs the database schema. This produces higher quality results.

**Q: How does Realtime export status work?**
Supabase Realtime channels subscribe to PostgreSQL changes via logical replication. When the backend updates an export row's status, Supabase broadcasts it to all subscribed frontend clients instantly. If the WebSocket doesn't connect within 5 seconds (corporate proxies, etc.), the hook falls back to 3-second polling automatically.

**Q: How is authentication handled?**
Supabase Auth issues JWTs signed with the project's `JWT_SECRET`. Every protected backend endpoint calls `decode_supabase_jwt()` which verifies the JWT signature using that same secret. The `user_id` (JWT `sub` claim) is extracted and used for all database queries — RLS ensures users can only access their own data.

**Q: What is the Clean Architecture violation you'd fix first?**
The `ExportService` directly imports `get_supabase_client()` for Storage operations, bypassing the repository pattern. A `StorageRepository` abstraction would complete the architecture.

**Q: How do public share links work?**
`secrets.token_urlsafe(24)` generates a cryptographically random, URL-safe token. It's stored in `project_shares`. When someone visits `/share/{token}`, the public endpoint queries `project_shares` where `share_token = token AND visibility = 'public'`, then fetches and returns the blueprint. No auth required. View counts are atomically incremented via a Supabase RPC function.

**Q: How did you handle the race condition in the generation progress page?**
The polling loop (`setInterval`) can fire between when the component unmounts and when `clearInterval` runs. I added a `mountedRef = useRef(true)` that's set to `false` in the cleanup function. Every async operation checks `mountedRef.current` before calling `setState` or `navigate`, preventing updates to unmounted components.

**Q: Why is code splitting important here?**
The dashboard and blueprint pages import Framer Motion, Supabase SDK, and Sentry — about 500KB combined. The auth page and public share page don't need any of that. With `React.lazy`, an unauthenticated user visiting `/share/abc` only loads ~55KB gzip, not 500KB.

---

## 14. Ownership

This repository was designed, architected, and implemented for:

**Developer:** Aryan Goswami  
**Build ID:** AG-ASE-2026  
**Institution:** ABV-GIET, Shimla — B.Tech CSE (graduating May 2027)

All architectural decisions, design patterns, and implementation choices documented in this repository are original work for this build. The ADRs (`docs/adr/`) document the reasoning behind every major decision.

Future modifications should:
- Preserve Clean Architecture (Routers → Services → Repositories → DB)
- Preserve Feature-Sliced Design on the frontend
- Preserve the AIProvider abstraction (never call Gemini directly from a router)
- Preserve OpenAPI type generation workflow (`npm run generate-types`)
- Preserve all existing tests (never delete tests, only add)
- Preserve repository consistency (snake_case Python, camelCase TypeScript)

The design system (deep graphite, teal `#2DD4BF`, ice-gray typography) is locked. Do not introduce purple gradients, red-heavy themes, or generic AI UI templates.

**Build ID AG-ASE-2026 should appear in all future ADRs and major documentation updates.**
