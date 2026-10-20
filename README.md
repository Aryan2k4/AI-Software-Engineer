# AI Software Engineer — AG-ASE-2026

## Next.js rebuild (v3)

The new application is in **[web/](./web/README.md)**. Start it with `cd web`, `npm ci`, and `npm run dev`. It includes functional project navigation, saved demo workspaces, artifact inspection, task boards, context history, NextAuth, Prisma/PostgreSQL routes, and server model integration. See its README for verified capabilities and remaining limitations. The GitHub Pages URL still hosts the earlier application; deploying v3 requires a Next.js server host.

The documentation below describes the earlier implementation.

> A local-first autonomous engineering workspace. It turns product intent into an architecture, implementation plan, tests, and a reviewable delivery record through a seven-stage agent pipeline.

[![CI](https://github.com/your-org/ai-software-engineer/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/ai-software-engineer/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.12-blue)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green)](https://fastapi.tiangolo.com/)

## Architecture

```
One-sentence idea
       │
       ▼
  7-Stage Agent Pipeline
       │
  ┌────▼─────────────────────────────────────────┐
  │  1. Idea Clarification                        │
  │  2. Tech Stack Selection                      │
  │  3. Architecture Design                       │
  │  4. Database Schema                           │
  │  5. API Design                                │
  │  6. Implementation Roadmap                    │
  │  7. Security & Deployment                     │
  └──────────────────────────────────────────────┘
       │
       ▼
  9-Section Engineering Blueprint.
```

## Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React 18 · TypeScript 5 · Vite · Tailwind CSS · Framer Motion |
| Backend    | FastAPI · Python 3.12 · Pydantic v2     |
| Database   | Supabase (PostgreSQL · Auth · Realtime · Storage) |
| AI         | Ollama (local / free) · Mock (default) · Gemini · Groq · Grok · OpenRouter |
| Testing    | Vitest · pytest · Testing Library       |

## Quick Start

```bash
# 1. Clone
git clone https://github.com/your-org/ai-software-engineer
cd ai-software-engineer

# 2. Backend — works without API keys in deterministic demo mode
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # optional: set AI_PROVIDER=ollama for local inference
uvicorn app.main:app --reload

# 3. Frontend
cd ../frontend
npm install
cp .env.example .env   # fill in keys
npm run dev
```

## Documentation

- [Architecture Decision Records](./docs/adr/)
- [API Documentation](./docs/api/)
- [Database Schema](./database/schema.md)
- [Blueprint v1.1 Spec](./docs/architecture/blueprint-v1.1.md)

## Local AI (free)

Install [Ollama](https://ollama.com), then run `ollama pull qwen2.5-coder:7b`.
Set `AI_PROVIDER=ollama`, `OLLAMA_BASE_URL=http://localhost:11434`, and
`OLLAMA_MODEL=qwen2.5-coder:7b` in `backend/.env`. The API calls Ollama only
from the server; model traffic and credentials never reach the browser.

## Portfolio highlights

- Provider-agnostic agent pipeline with a local, no-cost inference path
- Brutalist operator console with interactive demo orchestration
- Server-side FastAPI services, persistent projects, blueprint sharing, and export workflows
- Docker-ready development flow with isolated frontend and backend services

## Sprint Status

| Sprint | Description                    | Status      |
|--------|--------------------------------|-------------|
| S0     | Repository bootstrap           | ✅ Complete |
| S1     | Auth + Supabase integration    | ✅ Complete |
| S2     | AI pipeline foundation         | ✅ Complete |
| S3     | Blueprint generation UI        | ✅ Complete |
| S4     | Blueprint rendering            | ✅ Complete |
| S5     | Projects dashboard             | ✅ Complete |
| S6     | Exports + Sharing              | ✅ Complete |
| S7     | Error boundaries · Sentry · Code splitting · Onboarding | 🔄 In Progress |
