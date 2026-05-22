"use client";

import type { Op, QuerySpec } from "./query";
import type { Payload, QueryRequest } from "./engine";

type Resolution = "many" | "single" | "maybeSingle";

interface ApiResponse {
  data: unknown;
  error: { code?: string; message: string } | null;
  count: number | null;
}

async function callApi(req: QueryRequest, selectArg: string): Promise<ApiResponse> {
  const res = await fetch("/api/offline/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...req, selectArg }),
  });
  if (!res.ok) {
    return { data: null, error: { message: `HTTP ${res.status}` }, count: null };
  }
  return res.json();
}

class BrowserQueryBuilder implements PromiseLike<ApiResponse> {
  private spec: QuerySpec = { filters: [], order: [], limit: null };
  private payload: Payload = { kind: "select", head: false, count: null };
  private resolution: Resolution = "many";
  private selectArg = "*";

  constructor(private readonly table: QueryRequest["table"]) {}

  select(arg: string = "*", opts?: { count?: "exact" | null; head?: boolean }): this {
    this.selectArg = arg;
    if (this.payload.kind !== "insert" && this.payload.kind !== "update") {
      this.payload = {
        kind: "select",
        head: !!opts?.head,
        count: opts?.count ?? null,
      };
    }
    return this;
  }
  insert(row: Record<string, unknown>): this { this.payload = { kind: "insert", row }; return this; }
  update(patch: Record<string, unknown>): this { this.payload = { kind: "update", patch }; return this; }
  delete(): this { this.payload = { kind: "delete" }; return this; }

  eq(c: string, v: unknown): this { return this.push({ kind: "eq", column: c, value: v }); }
  neq(c: string, v: unknown): this { return this.push({ kind: "neq", column: c, value: v }); }
  in(c: string, vs: unknown[]): this { return this.push({ kind: "in", column: c, values: vs }); }
  gte(c: string, v: unknown): this { return this.push({ kind: "gte", column: c, value: v }); }
  lte(c: string, v: unknown): this { return this.push({ kind: "lte", column: c, value: v }); }
  gt(c: string, v: unknown): this { return this.push({ kind: "gt", column: c, value: v }); }
  lt(c: string, v: unknown): this { return this.push({ kind: "lt", column: c, value: v }); }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.spec.order.push({ column: col, ascending: opts?.ascending ?? true });
    return this;
  }
  limit(n: number): this { this.spec.limit = n; return this; }
  single(): this { this.resolution = "single"; return this; }
  maybeSingle(): this { this.resolution = "maybeSingle"; return this; }

  private push(op: Op): this { this.spec.filters.push(op); return this; }

  then<TResult1 = ApiResponse, TResult2 = never>(
    onfulfilled?: ((value: ApiResponse) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): PromiseLike<TResult1 | TResult2> {
    return callApi(
      { table: this.table, spec: this.spec, payload: this.payload, resolution: this.resolution },
      this.selectArg,
    ).then(onfulfilled, onrejected);
  }
}

// Simulate realtime by polling the snapshot revision counter. When it
// changes, fire the registered callback.
class BrowserChannel {
  private callbacks: Array<() => void> = [];
  private interval: ReturnType<typeof setInterval> | null = null;
  private lastRev: number | null = null;

  on(_evt: string, _opts: unknown, cb: () => void) {
    this.callbacks.push(cb);
    return this;
  }
  subscribe() {
    const tick = async () => {
      try {
        const res = await fetch("/api/offline/rev", { cache: "no-store" });
        if (!res.ok) return;
        const { rev } = (await res.json()) as { rev: number };
        if (this.lastRev !== null && rev !== this.lastRev) {
          this.callbacks.forEach((cb) => cb());
        }
        this.lastRev = rev;
      } catch {
        // ignore
      }
    };
    void tick();
    this.interval = setInterval(tick, 1500);
    return this;
  }
  cleanup() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.callbacks = [];
  }
}

let cached: ReturnType<typeof makeClient> | null = null;
const channels = new Set<BrowserChannel>();

function makeClient() {
  return {
    from: (table: string) => new BrowserQueryBuilder(table as QueryRequest["table"]),
    channel: (_name: string) => {
      const ch = new BrowserChannel();
      channels.add(ch);
      return ch;
    },
    removeChannel: (ch: BrowserChannel) => {
      ch.cleanup();
      channels.delete(ch);
    },
  };
}

export function getOfflineBrowserClient() {
  if (!cached) cached = makeClient();
  return cached;
}
