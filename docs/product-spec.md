# St Thomas Polyclinic — Patient Queue & Check-in System

**Product Specification (v2)**
Source: Demo meeting, 19 May 2026 — Drug Service / GovTech / OPC stakeholders
Prototype under review: <https://st-thomas-queue.netlify.app/>
Target outcome: Second demo with the items below before deployment.

---

## 1. Goal and context

Modernise outpatient clinic workflows by replacing paper tickets with a digital queue and check-in system that:

- Reduces patient waiting time and lobby congestion.
- Protects patient privacy in open waiting areas.
- Integrates the pharmacy workflow with electronic prescriptions, reducing patient visits from three to two.
- Scales from St Thomas OPC to a full polyclinic, and eventually to all public clinics nationally.

Guiding philosophy from the meeting: **progress over perfection** — deploy workable iterations and improve continuously.

---

## 2. Prototype audit (what already exists)

| Capability | Status | Location |
|---|---|---|
| QR-code / link sign-in | Done | `/`, `/admin/qr` |
| Kiosk sign-in mode | Done | `/?kiosk=true` |
| Name + visit type capture | Done | `SignInForm` |
| National ID / passport capture | Done | `SignInForm` (radio toggle) |
| Patient self-lookup of queue position | Done | `/lookup`, `/queue/[token]` |
| Public display screen | Done | `/display` |
| Audio chime on patient call | Done | `QueueDisplay` (recent commit) |
| Staff dashboard (call / mark seen / reset) | Done | `/staff` |
| Pharmacy queue dashboard | Done | `/pharmacy` |
| Daily reset | Done | `StaffQueue` |
| Visit type: general / follow-up / pharmacy / other | Done | `lib/types.ts` |

---

## 3. New scope to add before the second demo

Items below come directly from the meeting notes. Each is sized so an engineer can pick it up. Priority reflects sequencing for the next demo, not perceived importance.

### P0 — Required for second demo

#### 3.1 Staff authentication
**Why:** Meeting explicitly listed staff sign-in as an immediate next step (~13:30 in transcript). Today `/staff` and `/pharmacy` are open to anyone with the URL.
**Requirements:**
- Username/password sign-in for staff and pharmacy roles, stored in Supabase Auth.
- Role-based access: `clinician` (sees `/staff`), `pharmacist` (sees `/pharmacy`), `admin` (sees both + `/admin`).
- Session persists across reloads; sign-out clears it.
- Lock the staff and pharmacy routes behind auth at the server layer (server actions and page-level guards).
**Out of scope:** SSO with government IdP — deferred.

#### 3.2 Separate queues per service stream with synced numbering
**Why:** Meeting (~25:00) — pharmacy and GP queues must run independently but share a numbering scheme so staff and patients don't get confused when transfers happen.
**Requirements:**
- One logical queue per visit type: `general`, `follow-up`, `pharmacy`, `other`. Pharmacy is its own stream; general + follow-up + other share the clinical stream (TBD with clinic).
- Each entry has both a queue-specific position **and** a daily clinic-wide ticket number, so patients keep a stable reference when transferred.
- Display screen segmented by queue (e.g., "Now serving — Doctor: 14 · Pharmacy: 7").

#### 3.3 Patient transfer between queues
**Why:** Meeting (~28:21, 44:00) — patient flow doctor → pharmacy is the common case; transfers must not allow queue-jumping.
**Requirements:**
- **Staff-initiated transfer** from `/staff` and `/pharmacy`: drag-and-drop (or a "Move to…" menu) to relocate a patient to another queue.
- **Patient-initiated transfer** from `/queue/[token]`: a button "Move to pharmacy" (or relevant target) that the patient or patient advocate can tap.
- Transferred patient is placed at the **end** of the destination queue. Original arrival time is preserved on the record for audit, but queue position is recalculated.
- Audit trail: who transferred, from where, when. Surfaced in the staff dashboard expandable row.

#### 3.4 Privacy on the public display
**Why:** Meeting (~12:30) — names will be called aloud, but the public-facing display must not expose full patient data.
**Requirements:**
- Display shows: ticket number + first name + last-initial (e.g., "14 — Karen W.") for `called` state. `waiting` entries show only the ticket number.
- Audio announcement reads the same masked form: "Number 14, Karen W., please go to room 2."
- Staff and pharmacy dashboards continue to show full identifiers.

#### 3.5 Pharmacy: prescription-aware workflow
**Why:** Meeting (~33:00, 35:00) — the pharmacy queue replaces paper tickets and must work for patients with and without a physical prescription, without integrating with MedData.
**Requirements:**
- On pharmacy sign-in (or transfer), capture: ID number (already done) + optional "Has prescription on hand? Yes / No / Will collect electronically".
- Pharmacist dashboard shows queue entries grouped by status, with a "Notes" field per entry for the pharmacist to track fulfilment progress (e.g., "Pulled — awaiting verification").
- "Mark served" remains the terminal state; add intermediate "Preparing" status for visibility.
- Manual MedData entry continues outside the system — no integration in this iteration.

#### 3.6 Priority / override flow
**Why:** Meeting (~44:00) — police, prison officers, and emergencies are handled outside the normal queue.
**Requirements:**
- Staff dashboard has a "Priority insert" action: add a patient who jumps directly to the front of a chosen queue with a `priority` flag set.
- Priority entries are visually distinguished on the staff display (e.g., red border) but **not** distinguished on the public display.
- Reason free-text field (police / prison officer / emergency / other) for audit.

### P1 — Wanted, but can ship in a follow-up

#### 3.7 Remote queue-status notifications
**Why:** Meeting (~26:00) — patients should be able to wait elsewhere and be told when to return.
**Requirements:**
- `/queue/[token]` already shows position live. Add browser push (where supported) or visible "you are next" badge with audible alert when the patient hits position ≤ 2.
- Optional SMS via a Barbadian SMS provider, behind a feature flag — deferred unless cost approved.

#### 3.8 Multifunctional display screen
**Why:** Meeting (~15:00) — display screens should also carry public-service announcements; outdoor patio screens are planned.
**Requirements:**
- `/display` gets two rotating panels: queue status (primary, top 60% of screen) and a PSA carousel (bottom 40%) sourced from a simple admin-managed list (image + caption, with start/end dates).
- Display layout supports both indoor (portrait, lobby) and outdoor (landscape, patio) orientations via a URL flag, e.g., `/display?layout=outdoor`.

#### 3.9 Daily reset & session refresh
**Why:** Meeting — system must refresh and reset daily for accuracy.
**Requirements:**
- Today's reset is manual on `/staff`. Add a scheduled job (Supabase cron or a server action triggered nightly) to soft-archive entries created before today's date at 00:00 local.
- Daily ticket numbering restarts at 1 per queue.

#### 3.10 Christmas wishlist intake
**Why:** Leann King committed to sending a list of desired features (~01:09:18).
**Requirements:**
- Lightweight `/admin/feedback` form (admin-only) where stakeholders can submit feature requests, stored in Supabase. This avoids losing input between demos.

### P2 — Future / out of scope for the second demo

These were discussed but are larger initiatives.

| Item | Notes |
|---|---|
| Migrate hosting from Netlify to **AWS in Canada** | Meeting confirmed AWS-Canada as target (~53:00). Tracked separately from feature work — needs infra review and budget. |
| Scale to all public clinics nationally | Long-term vision (~01:00:40). Multi-tenant model TBD. |
| New Drug Service website on `gov.bb` | Separate GovTech work-stream (~01:07:00–01:08:00). |
| Restore pharmacy newsletter email to ~110 pharmacies | MIS backend / permissions issue (~55:00–56:30). Not part of this codebase. |
| Public-facing drug availability aggregator | Separate product (~01:10:00). |
| Permit application portal | Separate product (~01:10:00). |
| Enhanced data security (encryption at rest, audit logging, retention policy) | Listed as future enhancement. Pre-deployment minimum: HTTPS, Supabase RLS reviewed, no PII in logs. |

---

## 4. Non-functional requirements

- **Accessibility:** Kiosk path must work without a smartphone. Patient-advocate workflow assumes a staff member can sign in on behalf of a patient — current sign-in form already supports this; document in the staff onboarding guide.
- **Performance:** Display screen must refresh within 2 s of a state change (current implementation polls every 2 s, acceptable).
- **Privacy:** No full national ID number displayed on public screens or in audio. Staff dashboards mask the middle of the ID by default with a "reveal" tap.
- **Reliability:** System must survive a one-day demo with ~30 sign-ins without manual intervention.
- **Browser support:** Latest Chrome, Safari, Edge on desktop; Safari and Chrome on iOS/Android (kiosk likely runs in Chrome).

---

## 5. Data model changes

Additive — no destructive migrations.

```sql
-- queue_entries: new columns
ALTER TABLE queue_entries
  ADD COLUMN ticket_number int,            -- daily, per queue
  ADD COLUMN priority boolean DEFAULT false,
  ADD COLUMN priority_reason text,
  ADD COLUMN transferred_from text,        -- visit_type the entry started in
  ADD COLUMN pharmacy_notes text,
  ADD COLUMN has_prescription text         -- 'yes' | 'no' | 'electronic'
;

-- new tables
CREATE TABLE staff_users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  role text CHECK (role IN ('clinician', 'pharmacist', 'admin')) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE queue_audit (
  id bigserial PRIMARY KEY,
  entry_id uuid REFERENCES queue_entries(id),
  actor_id uuid REFERENCES staff_users(id),
  action text NOT NULL,                    -- 'call' | 'seen' | 'transfer' | 'priority_insert'
  detail jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE psa_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caption text NOT NULL,
  image_url text,
  starts_at date,
  ends_at date,
  active boolean DEFAULT true
);
```

---

## 6. Open questions for the next meeting

1. Do "general" and "follow-up" share one clinical queue, or are they separate?
2. Who provisions staff accounts — GovTech, or the clinic IT lead?
3. SMS notifications: is there budget for an SMS provider, or stay web-push-only?
4. For the AWS-Canada move: is there a target date relative to clinic go-live?
5. Patient-advocate workflow: do they sign in *as* the patient, or do we need a separate "assisted sign-in" mode that records the advocate's identity?
6. Priority insert audit — who reviews this, and how often?

---

## 7. Action items captured from the meeting

(Mirrored from the meeting notes — kept here so the spec is self-contained.)

| Owner | Action | Timestamp |
|---|---|---|
| Leann King | Arrange a clinic demo visit; gather feedback from Dr. Batson Grace | 13:57 |
| Leann King | Send Christmas wishlist of features | 01:09:18 |
| Dev team | Record screen-capture demo including QR-code flow | 14:20 |
| Dev team | Add patient ID capture during sign-in (done in prototype, confirm) | 21:31 |
| Dev team | Implement transfer function between doctor / pharmacy queues | 28:21 |
| Technical team | Fix MIS backend / email server for pharmacy newsletter | 55:40 |
| GovTech | Redevelop and host Drug Service site on gov.bb; train internal IT | 01:07:44 |
| All | Continue iterative meetings and feedback | 01:09:36 |
