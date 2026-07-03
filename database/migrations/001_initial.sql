-- Migration 001: Initial schema
-- Run in Supabase SQL editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ── projects ──────────────────────────────────────────────────────────────────
create table if not exists projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  original_idea text not null,
  status       text not null default 'pending'
                 check (status in ('pending','running','completed','failed')),
  current_stage int not null default 0,
  total_stages  int not null default 7,
  blueprint_id  uuid,
  error_message text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table projects enable row level security;

create policy "users manage own projects"
  on projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── blueprints ────────────────────────────────────────────────────────────────
create table if not exists blueprints (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  original_idea text not null,
  sections     jsonb not null default '{}',
  version      text not null default '1.1',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table blueprints enable row level security;

create policy "users manage own blueprints"
  on blueprints for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── updated_at trigger ────────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_updated_at before update on projects
  for each row execute function update_updated_at();

create trigger blueprints_updated_at before update on blueprints
  for each row execute function update_updated_at();
