// Shared execution engine: resolves a serialised QueryRequest against
// the in-memory store. Used by both the server-side offline client and
// the /api/offline route.

import { randomUUID } from "crypto";
import { applyQuery, type QuerySpec, type Row } from "./query";
import { bumpRev, getStore, nextAuditId } from "./store";

type TableName = "queue_entries" | "queue_audit" | "staff_users" | "auth_users";

export type Payload =
  | { kind: "select"; head: boolean; count: "exact" | null }
  | { kind: "insert"; row: Row }
  | { kind: "update"; patch: Row }
  | { kind: "delete" };

export interface QueryRequest {
  table: TableName;
  spec: QuerySpec;
  payload: Payload;
  resolution: "many" | "single" | "maybeSingle";
}

export interface QueryResponse {
  data: unknown;
  error: { code?: string; message: string } | null;
  count: number | null;
}

function tableRef(name: TableName): Row[] {
  const s = getStore();
  return s[name] as unknown as Row[];
}

function setTable(name: TableName, rows: Row[]): void {
  const s = getStore() as unknown as Record<TableName, Row[]>;
  s[name] = rows;
}

function applyDefaults(table: TableName, row: Row): Row {
  if (table === "queue_entries") {
    return {
      id: row.id ?? randomUUID(),
      created_at: row.created_at ?? new Date().toISOString(),
      called_at: row.called_at ?? null,
      seen_at: row.seen_at ?? null,
      priority: row.priority ?? false,
      priority_reason: row.priority_reason ?? null,
      transferred_from: row.transferred_from ?? null,
      pharmacy_notes: row.pharmacy_notes ?? null,
      has_prescription: row.has_prescription ?? null,
      ticket_number: row.ticket_number ?? null,
      status: row.status ?? "waiting",
      ...row,
    };
  }
  if (table === "queue_audit") {
    return {
      id: nextAuditId(),
      created_at: row.created_at ?? new Date().toISOString(),
      entry_id: row.entry_id ?? null,
      actor_id: row.actor_id ?? null,
      actor_label: row.actor_label ?? null,
      detail: row.detail ?? null,
      ...row,
    };
  }
  return { ...row };
}

function pickColumns(row: Row, selectArg: string): Row {
  if (!selectArg || selectArg === "*") return row;
  const cols = selectArg.split(",").map((s) => s.trim()).filter(Boolean);
  const out: Row = {};
  for (const c of cols) out[c] = row[c];
  return out;
}

export function executeQuery(req: QueryRequest, selectArg = "*"): QueryResponse {
  const rows = tableRef(req.table);

  if (req.payload.kind === "select") {
    const matched = applyQuery(rows, req.spec);
    if (req.payload.head && req.payload.count === "exact") {
      return { data: null, error: null, count: matched.length };
    }
    const projected = matched.map((r) => pickColumns(r, selectArg));
    if (req.resolution === "single") {
      if (projected.length === 0) {
        return { data: null, error: { code: "PGRST116", message: "no rows" }, count: null };
      }
      return { data: projected[0], error: null, count: null };
    }
    if (req.resolution === "maybeSingle") {
      return { data: projected[0] ?? null, error: null, count: null };
    }
    return { data: projected, error: null, count: req.payload.count ? matched.length : null };
  }

  if (req.payload.kind === "insert") {
    const insertRow = req.payload.row;
    if (req.table === "queue_entries" && insertRow.token) {
      const dup = rows.find((r) => r.token === insertRow.token);
      if (dup) {
        return { data: null, error: { code: "23505", message: "duplicate token" }, count: null };
      }
    }
    const inserted = applyDefaults(req.table, insertRow);
    rows.push(inserted);
    bumpRev();
    const projected = pickColumns(inserted, selectArg);
    if (req.resolution === "single" || req.resolution === "maybeSingle") {
      return { data: projected, error: null, count: null };
    }
    return { data: [projected], error: null, count: null };
  }

  if (req.payload.kind === "update") {
    const matched = applyQuery(rows, { ...req.spec, limit: null });
    for (const m of matched) Object.assign(m, req.payload.patch);
    bumpRev();
    const projected = matched.map((r) => pickColumns(r, selectArg));
    if (req.resolution === "single") {
      if (projected.length === 0) {
        return { data: null, error: { code: "PGRST116", message: "no rows" }, count: null };
      }
      return { data: projected[0], error: null, count: null };
    }
    if (req.resolution === "maybeSingle") {
      return { data: projected[0] ?? null, error: null, count: null };
    }
    return { data: projected, error: null, count: null };
  }

  if (req.payload.kind === "delete") {
    const matched = applyQuery(rows, { ...req.spec, limit: null });
    const idsToRemove = new Set(matched.map((r) => r.id as string));
    const filtered = rows.filter((r) => !idsToRemove.has(r.id as string));
    setTable(req.table, filtered);
    bumpRev();
    return { data: null, error: null, count: null };
  }

  return { data: null, error: { message: "unknown payload" }, count: null };
}

export function getSnapshot() {
  const s = getStore();
  return {
    rev: s.rev,
    queue_entries: s.queue_entries,
    queue_audit: s.queue_audit,
  };
}

export function authSignIn(email: string, password: string) {
  const s = getStore();
  const user = s.auth_users.find((u) => u.email === email && u.password === password);
  if (!user) return null;
  return { id: user.id, email: user.email };
}

export function authLookup(userId: string) {
  const s = getStore();
  const u = s.auth_users.find((x) => x.id === userId);
  if (!u) return null;
  return { id: u.id, email: u.email };
}
