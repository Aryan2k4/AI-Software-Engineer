# Database Schema — AG-ASE-2026

Supabase (PostgreSQL 15) — all tables use UUID primary keys, RLS enabled.

## Tables

### `projects`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| user_id | uuid | FK → auth.users.id |
| name | text | NOT NULL |
| original_idea | text | NOT NULL |
| status | text | enum: pending/running/completed/failed |
| current_stage | int | 0–7 |
| total_stages | int | default 7 |
| blueprint_id | uuid | FK → blueprints.id, nullable |
| error_message | text | nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-updated |

### `blueprints`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| project_id | uuid | FK → projects.id |
| user_id | uuid | FK → auth.users.id |
| original_idea | text | |
| sections | jsonb | BlueprintSections v1.1 |
| version | text | default '1.1' |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-updated |

### `exports`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| project_id | uuid | FK → projects.id |
| user_id | uuid | FK → auth.users.id |
| format | text | enum: markdown/pdf/json |
| status | text | enum: pending/processing/completed/failed |
| file_url | text | Supabase Storage signed URL, nullable |
| error_message | text | nullable |
| created_at | timestamptz | default now() |
| completed_at | timestamptz | nullable |

### `project_shares`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| project_id | uuid | FK → projects.id |
| user_id | uuid | FK → auth.users.id |
| share_token | text | UNIQUE, URL-safe random 24-char |
| visibility | text | enum: public/private, default public |
| view_count | int | default 0 |
| expires_at | timestamptz | nullable |
| created_at | timestamptz | default now() |

## Storage Buckets

### `exports`
- Access: private (signed URLs only)
- Path pattern: `{user_id}/{export_id}/{filename}`
- URL expiry: 7 days

## RLS Policies

All tables: users can only SELECT/INSERT/UPDATE/DELETE their own rows via `auth.uid() = user_id`.

`project_shares`: public read allowed when `visibility = 'public'` and token matches.

## Functions / RPCs

### `increment_share_view_count(share_id uuid)`
Atomically increments `project_shares.view_count` by 1.

### `pg_try_advisory_lock(key bigint)`
Used as best-effort generation lock to prevent duplicate runs.

## Realtime

Channels enabled on `exports` table for status updates (INSERT, UPDATE).
Frontend subscribes via `useExportStatus` hook (ADR-005).
