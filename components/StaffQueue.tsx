"use client";

import { useEffect, useState, useTransition } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import type { QueueEntry } from "@/lib/types";
import {
  callPatientAction,
  markSeenAction,
  resetDayAction,
  staffLogoutAction,
} from "@/app/actions";

interface Props {
  initialEntries: QueueEntry[];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: QueueEntry["status"]) {
  switch (status) {
    case "waiting":
      return "bg-slate-100 text-slate-700";
    case "called":
      return "bg-amber-100 text-amber-800";
    case "seen":
      return "bg-emerald-100 text-emerald-800";
  }
}

export function StaffQueue({ initialEntries }: Props) {
  const [entries, setEntries] = useState<QueueEntry[]>(initialEntries);
  const [pending, startTransition] = useTransition();
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();

    async function refresh() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("queue_entries")
        .select("*")
        .gte("created_at", today.toISOString())
        .order("created_at", { ascending: true });
      setEntries((data ?? []) as QueueEntry[]);
    }

    const channel = supabase
      .channel("queue:staff")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_entries" },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const waiting = entries.filter((e) => e.status === "waiting");
  const called = entries.filter((e) => e.status === "called");
  const seen = entries.filter((e) => e.status === "seen");

  function submitAction(action: (fd: FormData) => Promise<void>, id: string) {
    const fd = new FormData();
    fd.set("id", id);
    startTransition(() => action(fd));
  }

  function handleReset() {
    startTransition(() => resetDayAction());
    setConfirmingReset(false);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">
            Staff dashboard
          </p>
          <h1 className="mt-1 text-3xl font-bold">Today&apos;s queue</h1>
        </div>
        <form action={staffLogoutAction}>
          <button type="submit" className="btn-secondary">
            Sign out
          </button>
        </form>
      </header>

      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        <Stat label="Waiting" value={waiting.length} />
        <Stat label="Called" value={called.length} />
        <Stat label="Seen" value={seen.length} />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Active queue</h2>
        {entries.filter((e) => e.status !== "seen").length === 0 ? (
          <p className="mt-3 rounded-lg bg-slate-50 p-6 text-center text-slate-500">
            No patients waiting.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200">
            {entries
              .filter((e) => e.status !== "seen")
              .map((e, idx) => (
                <li
                  key={e.id}
                  className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[3rem_1fr_auto] sm:items-center"
                >
                  <span className="text-2xl font-bold text-brand">{idx + 1}</span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-semibold">{e.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${statusBadge(
                          e.status,
                        )}`}
                      >
                        {e.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {e.visit_type} &middot; arrived {formatTime(e.created_at)} &middot;
                      <span className="ml-1 font-mono tracking-widest">
                        {e.token}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2 sm:justify-end">
                    {e.status === "waiting" && (
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={pending}
                        onClick={() => submitAction(callPatientAction, e.id)}
                      >
                        Call
                      </button>
                    )}
                    {e.status === "called" && (
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={pending}
                        onClick={() => submitAction(markSeenAction, e.id)}
                      >
                        Mark seen
                      </button>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>

      {seen.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-500">
            Seen today ({seen.length})
          </h2>
          <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 text-sm text-slate-600">
            {seen.map((e) => (
              <li key={e.id} className="flex items-center justify-between p-3">
                <span>{e.name}</span>
                <span className="text-slate-400">
                  {e.seen_at ? formatTime(e.seen_at) : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10 rounded-lg border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-800">Reset today&apos;s queue</h2>
        <p className="mt-2 text-sm text-red-900">
          Deletes every entry created today. Use this at end of day or for a fresh
          start.
        </p>
        {confirmingReset ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-danger"
              disabled={pending}
              onClick={handleReset}
            >
              Yes, delete all of today&apos;s entries
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setConfirmingReset(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-danger mt-4"
            onClick={() => setConfirmingReset(true)}
          >
            Reset day
          </button>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-slate-600">{label}</div>
    </div>
  );
}
