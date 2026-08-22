-- St Thomas OPC Patient Queue System -- Supabase schema
-- Run this once in the Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  name text not null,
  id_type text not null check (id_type in ('national_id', 'passport')),
  id_number text not null,
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
-- The service role key (server only) is used for ALL database access:
-- reads happen inside Next.js server code / API routes, writes via server
-- actions. The browser never talks to the table directly, so no anon or
-- authenticated policies exist here -- access is deny-by-default.
--
-- NOTE: a previous revision exposed every row (name, ID number, token) to
-- anyone holding the anon key via a `for select using (true)` policy and
-- realtime broadcasts. If you deployed that version, revoke it:
--
--   drop policy if exists "queue_entries public read" on public.queue_entries;
--
-- Existing deployments must also stop browser clients from subscribing to
-- postgres_changes on this table; the app now polls the server-side API
-- routes instead.

alter table public.queue_entries enable row level security;

-- Intentionally NO policies: only the service_role key (which bypasses RLS)
-- may read or write queue_entries, and it is used exclusively server-side.

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
