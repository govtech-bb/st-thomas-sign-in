# Supabase migrations

Run these in the Supabase SQL editor in order. Safe to re-run.

## 0001_p0_scope.sql

Additive changes for the P0 scope from `docs/product-spec.md`:

- `queue_entries`: adds `ticket_number`, `priority`, `priority_reason`,
  `transferred_from`, `pharmacy_notes`, `has_prescription`. Extends the
  `status` check constraint to include `'preparing'`.
- New table `staff_users` (auth user id + role) with RLS allowing each
  user to read their own role row.
- New table `queue_audit` for an append-only log of state changes.
- Adds the audit table to the `supabase_realtime` publication.

## 0002_seed_staff.sql

Seeds three demo Supabase Auth users and their `staff_users` role rows:

| Email                     | Role        | Password    |
| ------------------------- | ----------- | ----------- |
| admin@stthomas.demo       | admin       | DemoPass1!  |
| clinician@stthomas.demo   | clinician   | DemoPass1!  |
| pharmacist@stthomas.demo  | pharmacist  | DemoPass1!  |

**Change the password before the demo** — open the file and edit the
`v_password` variable at the top of the DO block, or rotate later
through the Supabase dashboard (Authentication → Users).

The seed is idempotent: re-running updates the password and role rather
than duplicating users.
