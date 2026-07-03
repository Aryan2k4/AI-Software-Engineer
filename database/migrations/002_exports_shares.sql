-- Migration 002: Exports and Shares (Sprint 6)

-- ── exports ───────────────────────────────────────────────────────────────────
create table if not exists exports (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  format        text not null check (format in ('markdown','pdf','json')),
  status        text not null default 'pending'
                  check (status in ('pending','processing','completed','failed')),
  file_url      text,
  error_message text,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

alter table exports enable row level security;

create policy "users manage own exports"
  on exports for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger exports_realtime_update after insert or update on exports
  for each row execute function update_updated_at();

-- ── project_shares ────────────────────────────────────────────────────────────
create table if not exists project_shares (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  share_token text not null unique,
  visibility  text not null default 'public'
                check (visibility in ('public','private')),
  view_count  int not null default 0,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

alter table project_shares enable row level security;

create policy "users manage own shares"
  on project_shares for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "public can read public shares"
  on project_shares for select
  using (visibility = 'public');

-- ── Supabase Realtime for exports ─────────────────────────────────────────────
-- Run in Supabase dashboard → Database → Replication → enable for exports table
-- Or via SQL:
-- alter publication supabase_realtime add table exports;

-- ── Storage bucket ────────────────────────────────────────────────────────────
-- Run in Supabase dashboard → Storage → New bucket: "exports" (private)

-- ── Advisory lock helper ──────────────────────────────────────────────────────
create or replace function try_generation_lock(project_id uuid)
returns boolean language plpgsql as $$
declare
  lock_key bigint;
begin
  lock_key := abs(hashtext(project_id::text));
  return pg_try_advisory_lock(lock_key);
end;
$$;

create or replace function release_generation_lock(project_id uuid)
returns void language plpgsql as $$
declare
  lock_key bigint;
begin
  lock_key := abs(hashtext(project_id::text));
  perform pg_advisory_unlock(lock_key);
end;
$$;

-- ── increment_share_view_count ────────────────────────────────────────────────
create or replace function increment_share_view_count(share_id uuid)
returns void language plpgsql security definer as $$
begin
  update project_shares
  set view_count = view_count + 1
  where id = share_id;
end;
$$;
