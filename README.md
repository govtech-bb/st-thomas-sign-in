# St Thomas OPC Patient Queue System

A lightweight, mobile-first patient queue management system for the **St Thomas
Outpatient Clinic** (Barbados). Patients scan a QR code on arrival, complete a
short sign-in form on their phone, and receive a personal link that tracks
their queue position in real time. Staff sign in with their clinic email to
manage two parallel queues (clinical and pharmacy) with transfer, priority
insert, and a prescription-aware pharmacist workflow.

## What it does

| Route              | Audience    | Purpose                                                                                |
| ------------------ | ----------- | -------------------------------------------------------------------------------------- |
| `/`                | Patients    | Sign-in form (QR code points here). Issues a personal link.                            |
| `/queue/[token]`   | Patients    | Live queue position + ticket number; patient-initiated transfer between streams.        |
| `/lookup`          | Patients    | Recover the personal link by ID number.                                                 |
| `/display`         | Public TV   | Waiting-room screen segmented by stream. Ticket numbers and masked names only.          |
| `/staff`           | Clinicians  | Auth-gated dashboard: call, mark seen, transfer, priority insert.                      |
| `/pharmacy`        | Pharmacists | Auth-gated pharmacy queue: prescription type, fulfilment notes, preparing/served.       |
| `/admin/qr`        | Staff       | Print-friendly QR code linking back to `/`.                                            |

## Tech stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** (mobile-first, AA-contrast palette)
- **Supabase** (Postgres + Realtime via `postgres_changes`)
- **`qrcode`** for server-side QR SVG generation
- Deployed to **Netlify** via `@netlify/plugin-nextjs`

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Create a new project at <https://supabase.com>.
2. In **SQL Editor**, run the following in order:
   - [`supabase/schema.sql`](supabase/schema.sql) — base `queue_entries`
     table, indexes, RLS, realtime.
   - [`supabase/migrations/0001_p0_scope.sql`](supabase/migrations/0001_p0_scope.sql)
     — adds ticket numbers, transfers, priority, the pharmacist workflow,
     `staff_users`, and the `queue_audit` log.
   - [`supabase/migrations/0002_seed_staff.sql`](supabase/migrations/0002_seed_staff.sql)
     — seeds demo staff accounts (edit the password literal first).
3. In **Project Settings -> API**, copy:
   - **Project URL** -> `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key -> `SUPABASE_SERVICE_ROLE_KEY` (server-only, do not
     commit, do not expose to the browser).

### 3. Configure environment

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable                          | Description                                            |
| --------------------------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase project URL                                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Supabase anon/public key                               |
| `SUPABASE_SERVICE_ROLE_KEY`       | Supabase service-role key (server-side writes)         |
| `NEXT_PUBLIC_BASE_URL`            | Public base URL used by the QR code (no trailing `/`)  |

Staff authentication uses Supabase Auth (email + password). Seed demo
accounts via `supabase/migrations/0002_seed_staff.sql`.

### 4. Run the dev server

```bash
npm run dev
```

The app is at <http://localhost:3000>.

## Generate and print the QR code

The QR code page is at [`/admin/qr`](http://localhost:3000/admin/qr) (no
authentication required for the MVP - keep the URL internal).

1. Navigate to `/admin/qr` on the deployed site (so it embeds the production
   URL, not `localhost`).
2. Click **Print this page** to print a poster with the QR code, clinic name,
   and brief instructions.
3. Display the printed page at the front desk.

If `NEXT_PUBLIC_BASE_URL` is set, the QR code uses that. Otherwise it falls
back to the request host headers.

## Staff dashboard

- Open `/staff` and sign in with your clinic email and password.
- Roles route automatically: **clinicians** see `/staff`, **pharmacists**
  see `/pharmacy`, **admins** see both plus the reset-day action.
- Click **Call** to mark a waiting patient as called.
- Click **Mark seen** after the consult to remove them from the active queue.
- **Move to…** transfers a patient to a different visit type; the entry is
  placed at the end of the destination queue.
- **+ Priority insert** adds an out-of-band entry (police / prison / emergency)
  to the front of a chosen queue. Hidden from the public display.
- **Reset day** (admin only) deletes every entry created today. Two-step
  confirmation.

## How the queue works

- On sign-in, a 4-character alphanumeric token (e.g. `A4X9`, no confusable
  characters) is generated server-side. Collisions are detected via the
  `token` unique constraint and the row is re-attempted with a fresh token.
- `position` is stored at sign-in as `count(waiting today) + 1`, but the
  displayed position is recalculated from current `waiting` rows with an
  earlier `created_at` -- so when staff call or mark someone as seen, every
  open phone immediately shows a smaller number.
- All views are scoped to the current calendar day (`created_at >=
  start_of_today`).
- The patient page, display screen, and staff dashboard all subscribe to
  `postgres_changes` on `queue_entries` for live updates.

## Deploy to Netlify

1. Push this folder to a new GitHub repository (e.g. `gavinwye/st-thomas-queue`).
2. In Netlify, click **Add new site -> Import an existing project** and pick
   the repo. Netlify reads `netlify.toml` automatically:

   ```toml
   [build]
     command = "npm run build"
     publish = ".next"

   [[plugins]]
     package = "@netlify/plugin-nextjs"
   ```

3. In **Site settings -> Environment variables**, add every variable from
   `.env.example`. Set `NEXT_PUBLIC_BASE_URL` to the production URL (e.g.
   `https://st-thomas-queue.netlify.app`).
4. Trigger a deploy. Subsequent pushes to `main` auto-deploy.

## Project structure

```
st-thomas-queue/
  app/
    page.tsx                      Sign-in form (QR destination)
    queue/[token]/page.tsx        Personal live queue page
    display/page.tsx              Waiting-room TV screen
    staff/page.tsx                Staff dashboard (PIN gate)
    admin/qr/page.tsx             Printable QR poster
    actions.ts                    Server actions: sign-in, staff actions
    layout.tsx, globals.css       App shell + Tailwind
  components/
    SignInForm.tsx
    QueuePosition.tsx             Patient live position with realtime
    QueueDisplay.tsx              Waiting-room realtime list
    StaffQueue.tsx                Staff dashboard realtime list
    StaffLogin.tsx                PIN entry form
    QRCode.tsx, PrintButton.tsx
  lib/
    supabase.ts                   Browser client (anon)
    supabase-server.ts            Server clients (anon + service role)
    queue.ts                      Server-side queue logic
    queue-client.ts               Client-safe helpers (initials, etc.)
    token.ts                      Token generation + validation
    staff.ts                      PIN cookie helpers
    types.ts                      Shared types and visit-type enum
  supabase/schema.sql             Run once in the Supabase SQL editor
  netlify.toml
  .env.example
```

## Acceptance criteria

- [x] Patient can scan QR, complete sign-in in under 30 seconds.
- [x] Patient receives a unique URL showing live queue position.
- [x] Queue position updates in real time when staff advance the queue.
- [x] `/display` screen updates live without manual refresh.
- [x] Staff can call and mark seen from `/staff`.
- [x] `/admin/qr` links to the production sign-in URL.
- [ ] Repo on GitHub with this README. _(Push to a new repo after lifting
      this folder out.)_
- [ ] Live on Netlify. _(Connect the repo in the Netlify dashboard.)_

## Out of scope (this sprint)

SMS or push notifications, patient authentication, appointment booking, EHR
integration, multi-department queues, analytics, ticket printing.

## Product brief

See the brief at the top of this project conversation for the original spec
this MVP was built against.
