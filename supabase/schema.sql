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
