-- St Thomas OPC -- P0 scope migration.
-- Run this in the Supabase SQL editor after the original schema.sql.
-- Safe to re-run: every statement is idempotent.

----------------------------------------------------------------------
-- 1. queue_entries: new columns for ticketing, transfer, priority,
--    and the pharmacy prescription workflow.
----------------------------------------------------------------------

alter table public.queue_entries
  add column if not exists ticket_number     integer,
  add column if not exists priority          boolean not null default false,
  add column if not exists priority_reason   text,
  add column if not exists transferred_from  text,
  add column if not exists pharmacy_notes    text,
  add column if not exists has_prescription  text;

-- Status now includes an intermediate 'preparing' state used by the
-- pharmacist dashboard between "called" and "seen".
alter table public.queue_entries
  drop constraint if exists queue_entries_status_check;

alter table public.queue_entries
  add constraint queue_entries_status_check
  check (status in ('waiting', 'called', 'preparing', 'seen'));

alter table public.queue_entries
  drop constraint if exists queue_entries_has_prescription_check;

alter table public.queue_entries
  add constraint queue_entries_has_prescription_check
  check (
    has_prescription is null
    or has_prescription in ('yes', 'no', 'electronic')
  );

-- Helpful indexes for the segmented display and per-stream numbering.
create index if not exists queue_entries_visit_type_created_at_idx
  on public.queue_entries (visit_type, created_at);

create index if not exists queue_entries_priority_idx
  on public.queue_entries (priority)
  where priority = true;

----------------------------------------------------------------------
-- 2. staff_users: maps an authenticated Supabase user to a role.
--    Roles: 'clinician' (sees /staff), 'pharmacist' (sees /pharmacy),
--           'admin' (sees both + /admin).
----------------------------------------------------------------------

create table if not exists public.staff_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  role        text not null check (role in ('clinician', 'pharmacist', 'admin')),
  created_at  timestamptz not null default now()
);

alter table public.staff_users enable row level security;

-- A signed-in staff member can read their own role row. All writes go
-- through the service_role key from the server.
drop policy if exists "staff_users self read" on public.staff_users;
create policy "staff_users self read"
  on public.staff_users
  for select
  using (auth.uid() = id);

----------------------------------------------------------------------
-- 3. queue_audit: append-only log of every state change. Surfaced in
--    the staff dashboard for transparency on transfers and priority
--    inserts.
----------------------------------------------------------------------

create table if not exists public.queue_audit (
  id           bigserial primary key,
  entry_id     uuid references public.queue_entries(id) on delete cascade,
  actor_id     uuid references auth.users(id) on delete set null,
  actor_label  text,
  action       text not null check (action in (
                 'sign_in',
                 'call',
                 'preparing',
                 'seen',
                 'transfer',
                 'priority_insert',
                 'pharmacy_note',
                 'reset_day'
               )),
  detail       jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists queue_audit_entry_id_idx
  on public.queue_audit (entry_id);

create index if not exists queue_audit_created_at_idx
  on public.queue_audit (created_at desc);

alter table public.queue_audit enable row level security;

-- No anon access. Service_role bypasses RLS for writes from the server.

----------------------------------------------------------------------
-- 4. Realtime: publish staff_users so role changes propagate, and
--    queue_audit so the staff dashboard can stream new audit rows.
----------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'queue_audit'
  ) then
    execute 'alter publication supabase_realtime add table public.queue_audit';
  end if;
end$$;
