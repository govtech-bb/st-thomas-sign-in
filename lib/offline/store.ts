// In-memory store used when NEXT_PUBLIC_OFFLINE_MODE=1. Lives for the
// lifetime of the dev/server process. Not persisted -- restarting the
// server clears all data.

import { randomUUID } from "crypto";

export interface OfflineQueueEntry {
  id: string;
  token: string;
  name: string;
  id_type: string;
  id_number: string;
  visit_type: string;
  position: number;
  ticket_number: number | null;
  status: "waiting" | "called" | "preparing" | "seen";
  priority: boolean;
  priority_reason: string | null;
  transferred_from: string | null;
  pharmacy_notes: string | null;
  has_prescription: string | null;
  created_at: string;
  called_at: string | null;
  seen_at: string | null;
}

export interface OfflineAuditRow {
  id: number;
  entry_id: string | null;
  actor_id: string | null;
  actor_label: string | null;
  action: string;
  detail: Record<string, unknown> | null;
  created_at: string;
}

export interface OfflineStaffUser {
  id: string;
  email: string;
  role: "clinician" | "pharmacist" | "admin";
}

export interface OfflineAuthUser {
  id: string;
  email: string;
  password: string;
}

interface Store {
  queue_entries: OfflineQueueEntry[];
  queue_audit: OfflineAuditRow[];
  staff_users: OfflineStaffUser[];
  auth_users: OfflineAuthUser[];
  audit_counter: number;
  rev: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __ST_THOMAS_OFFLINE_STORE__: Store | undefined;
}

function seed(): Store {
  const adminId = randomUUID();
  const clinId = randomUUID();
  const pharmId = randomUUID();
  return {
    queue_entries: [],
    queue_audit: [],
    staff_users: [
      { id: adminId, email: "admin@stthomas.demo", role: "admin" },
      { id: clinId, email: "clinician@stthomas.demo", role: "clinician" },
      { id: pharmId, email: "pharmacist@stthomas.demo", role: "pharmacist" },
    ],
    auth_users: [
      { id: adminId, email: "admin@stthomas.demo", password: "DemoPass1!" },
      { id: clinId, email: "clinician@stthomas.demo", password: "DemoPass1!" },
      { id: pharmId, email: "pharmacist@stthomas.demo", password: "DemoPass1!" },
    ],
    audit_counter: 0,
    rev: 0,
  };
}

export function getStore(): Store {
  if (!globalThis.__ST_THOMAS_OFFLINE_STORE__) {
    globalThis.__ST_THOMAS_OFFLINE_STORE__ = seed();
  }
  return globalThis.__ST_THOMAS_OFFLINE_STORE__;
}

export function bumpRev() {
  getStore().rev += 1;
}

export function nextAuditId(): number {
  const s = getStore();
  s.audit_counter += 1;
  return s.audit_counter;
}
