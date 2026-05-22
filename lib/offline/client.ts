// Supabase-compatible client backed by the in-memory offline store.
// Implements only the methods the app actually uses.

import { cookies } from "next/headers";
import { authLookup, authSignIn, executeQuery, type Payload, type QueryRequest } from "./engine";
import type { Op, QuerySpec } from "./query";

export const OFFLINE_SESSION_COOKIE = "stq_offline_session";

type Resolution = "many" | "single" | "maybeSingle";

class QueryBuilder<TRow = unknown> implements PromiseLike<{ data: unknown; error: { message: string } | null; count?: number | null }> {
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
  insert(row: Record<string, unknown>): this {
    this.payload = { kind: "insert", row };
    return this;
  }
  update(patch: Record<string, unknown>): this {
    this.payload = { kind: "update", patch };
    return this;
  }
  delete(): this {
    this.payload = { kind: "delete" };
    return this;
  }

  eq(col: string, val: unknown): this { return this.push({ kind: "eq", column: col, value: val }); }
  neq(col: string, val: unknown): this { return this.push({ kind: "neq", column: col, value: val }); }
  in(col: string, vals: unknown[]): this { return this.push({ kind: "in", column: col, values: vals }); }
  gte(col: string, val: unknown): this { return this.push({ kind: "gte", column: col, value: val }); }
  lte(col: string, val: unknown): this { return this.push({ kind: "lte", column: col, value: val }); }
  gt(col: string, val: unknown): this { return this.push({ kind: "gt", column: col, value: val }); }
  lt(col: string, val: unknown): this { return this.push({ kind: "lt", column: col, value: val }); }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.spec.order.push({ column: col, ascending: opts?.ascending ?? true });
    return this;
  }
  limit(n: number): this { this.spec.limit = n; return this; }
  single(): this { this.resolution = "single"; return this; }
  maybeSingle(): this { this.resolution = "maybeSingle"; return this; }

  private push(op: Op): this {
    this.spec.filters.push(op);
    return this;
  }

  then<TResult1 = { data: TRow; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: { message: string } | null; count?: number | null }) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): PromiseLike<TResult1 | TResult2> {
    try {
      const res = executeQuery(
        { table: this.table, spec: this.spec, payload: this.payload, resolution: this.resolution },
        this.selectArg,
      );
      return Promise.resolve({ data: res.data, error: res.error, count: res.count })
        .then(onfulfilled, onrejected);
    } catch (err) {
      return Promise.reject(err).then(onfulfilled, onrejected) as PromiseLike<TResult1 | TResult2>;
    }
  }
}

class OfflineChannel {
  on() { return this; }
  subscribe() { return this; }
}

// Server-side auth: cookie-backed. Mirrors the subset of supabase-js auth
// the app touches.
function makeAuth() {
  return {
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const user = authSignIn(email, password);
      if (!user) {
        return { data: { user: null, session: null }, error: { message: "Invalid login" } };
      }
      try {
        cookies().set({
          name: OFFLINE_SESSION_COOKIE,
          value: user.id,
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 12,
        });
      } catch {
        // not in a server-action context
      }
      return { data: { user, session: { user } }, error: null };
    },
    async signOut() {
      try {
        cookies().delete(OFFLINE_SESSION_COOKIE);
      } catch {
        // ignore
      }
      return { error: null };
    },
    async getUser() {
      const id = cookies().get(OFFLINE_SESSION_COOKIE)?.value;
      if (!id) return { data: { user: null }, error: null };
      const u = authLookup(id);
      if (!u) return { data: { user: null }, error: null };
      return { data: { user: u }, error: null };
    },
  };
}

export function offlineServerClient() {
  return {
    from: (table: string) => new QueryBuilder(table as QueryRequest["table"]),
    auth: makeAuth(),
    channel: () => new OfflineChannel(),
    removeChannel: () => undefined,
  };
}
