-- St Thomas OPC Patient Queue System -- Supabase schema
-- Run this once in the Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  name text not null,
  visit_type text not null,
  position integer not null,
  status text not null default 'waiting'
    check (status in ('waiting', 'called', 'seen')),
  created_at timestamptz not null default now(),
  called_at timestamptz,
  seen_at timestamptz
);

create index if not exists queue_entries_created_at_idx
  on public.queue_entries (created_at);

create index if not exists queue_entries_status_created_at_idx
  on public.queue_entries (status, created_at);

-- Row Level Security ---------------------------------------------------------
-- The MVP uses the anon key for public reads (queue display, personal page)
-- and the service role key from the server for all writes (sign-in, staff
-- actions, reset). Patients never write directly from the browser.

alter table public.queue_entries enable row level security;

-- Public read access -- queue position lookup and waiting-room display.
drop policy if exists "queue_entries public read" on public.queue_entries;
create policy "queue_entries public read"
  on public.queue_entries
  for select
  using (true);

-- No insert/update/delete policies for anon: those operations only succeed
-- via the service_role key (which bypasses RLS) used by the Next.js server.

-- Realtime -------------------------------------------------------------------
-- Add the table to the supabase_realtime publication so postgres_changes
-- broadcasts INSERT/UPDATE/DELETE events to subscribed clients.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'queue_entries'
  ) then
    execute 'alter publication supabase_realtime add table public.queue_entries';
  end if;
end$$;

-- Staff auth ----------------------------------------------------------------
-- Revocable staff session tokens. The cookie stores the row id (a random
-- UUID); the server looks it up here on every request. RLS is enabled with
-- no policies so only the service_role server client can touch this table.

create table if not exists public.staff_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists staff_sessions_expires_at_idx
  on public.staff_sessions (expires_at);

alter table public.staff_sessions enable row level security;

-- Per-IP failed-login tracker for /staff. failure_count drives exponential
-- backoff; locked_until is the wall-clock time until which logins from this
-- IP are rejected. Same RLS lock-down: service_role only.

create table if not exists public.staff_login_attempts (
  ip text primary key,
  failure_count integer not null default 0,
  first_failure_at timestamptz not null default now(),
  locked_until timestamptz
);

alter table public.staff_login_attempts enable row level security;
