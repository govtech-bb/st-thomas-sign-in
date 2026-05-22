// Pure-function query engine shared by the server-side offline client
// and the /api/offline route. Implements only the supabase-js features
// the app actually uses.

export type Row = Record<string, unknown>;

export type Op =
  | { kind: "eq"; column: string; value: unknown }
  | { kind: "neq"; column: string; value: unknown }
  | { kind: "in"; column: string; values: unknown[] }
  | { kind: "gte"; column: string; value: unknown }
  | { kind: "lte"; column: string; value: unknown }
  | { kind: "lt"; column: string; value: unknown }
  | { kind: "gt"; column: string; value: unknown };

export interface QuerySpec {
  filters: Op[];
  order: { column: string; ascending: boolean }[];
  limit: number | null;
}

export function applyQuery<T extends Row>(rows: T[], spec: QuerySpec): T[] {
  let out = rows.slice();
  for (const f of spec.filters) {
    out = out.filter((r) => matches(r, f));
  }
  for (const o of [...spec.order].reverse()) {
    out.sort((a, b) => {
      const av = a[o.column];
      const bv = b[o.column];
      const cmp = compare(av, bv);
      return o.ascending ? cmp : -cmp;
    });
  }
  if (spec.limit !== null) out = out.slice(0, spec.limit);
  return out;
}

function matches(row: Row, op: Op): boolean {
  const v = row[op.column];
  switch (op.kind) {
    case "eq": return v === op.value;
    case "neq": return v !== op.value;
    case "in": return op.values.includes(v);
    case "gte": return compare(v, op.value) >= 0;
    case "lte": return compare(v, op.value) <= 0;
    case "gt": return compare(v, op.value) > 0;
    case "lt": return compare(v, op.value) < 0;
  }
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") {
    return (a ? 1 : 0) - (b ? 1 : 0);
  }
  return String(a).localeCompare(String(b));
}
