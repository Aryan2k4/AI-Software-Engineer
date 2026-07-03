# AI Software Engineer — AG-ASE-2026

> Transform a one-sentence idea into a complete 9-section engineering blueprint via a 7-stage Gemini AI pipeline.

[![CI](https://github.com/your-org/ai-software-engineer/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/ai-software-engineer/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.12-blue)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green)](https://fastapi.tiangolo.com/)

## Architecture

```
One-sentence idea
       │
       ▼
  7-Stage Gemini Pipeline
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
  9-Section Engineering Blueprint
```

## Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React 18 · TypeScript 5 · Vite · Tailwind CSS · Framer Motion |
| Backend    | FastAPI · Python 3.12 · Pydantic v2     |
| Database   | Supabase (PostgreSQL · Auth · Realtime · Storage) |
| AI         | Google Gemini (primary) · Mock · Grok stub · OpenRouter stub |
| Testing    | Vitest · pytest · Testing Library       |

## Quick Start

```bash
# 1. Clone
git clone https://github.com/your-org/ai-software-engineer
cd ai-software-engineer

# 2. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in keys
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
