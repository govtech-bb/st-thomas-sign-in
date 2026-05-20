"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import type { QueueEntry, StaffRole } from "@/lib/types";
import { STREAM_LABELS, VISIT_TYPES, streamFor } from "@/lib/types";
import {
  callPatientAction,
  markSeenAction,
  priorityInsertAction,
  resetDayAction,
  staffLogoutAction,
  staffTransferAction,
} from "@/app/actions";

interface Props {
  initialEntries: QueueEntry[];
  role: StaffRole;
  email: string;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function statusBadge(status: QueueEntry["status"]) {
  switch (status) {
    case "waiting": return "bg-slate-100 text-slate-700";
    case "called": return "bg-amber-100 text-amber-800";
    case "preparing": return "bg-blue-100 text-blue-800";
    case "seen": return "bg-emerald-100 text-emerald-800";
  }
}

export function StaffQueue({ initialEntries, role, email }: Props) {
  const [entries, setEntries] = useState<QueueEntry[]>(initialEntries);
  const [pending, startTransition] = useTransition();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [openTransferFor, setOpenTransferFor] = useState<string | null>(null);
  const [showPriorityForm, setShowPriorityForm] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();

    async function refresh() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("queue_entries")
        .select("*")
        .gte("created_at", today.toISOString())
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true });
      setEntries((data ?? []) as QueueEntry[]);
    }

    const channel = supabase
      .channel("queue:staff")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_entries" },
        () => { void refresh(); },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, []);

  const stats = useMemo(() => ({
    waiting: entries.filter((e) => e.status === "waiting").length,
    called: entries.filter((e) => e.status === "called" || e.status === "preparing").length,
    seen: entries.filter((e) => e.status === "seen").length,
  }), [entries]);

  const active = entries.filter((e) => e.status !== "seen");
  const seen = entries.filter((e) => e.status === "seen");

  function submitAction(action: (fd: FormData) => Promise<void>, id: string) {
    const fd = new FormData();
    fd.set("id", id);
    startTransition(() => action(fd));
  }

  function handleTransfer(id: string, visitType: string) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("visit_type", visitType);
    startTransition(() => staffTransferAction(fd));
    setOpenTransferFor(null);
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
          <p className="mt-1 text-sm text-slate-500">
            Signed in as {email} ({role})
          </p>
        </div>
        <form action={staffLogoutAction}>
          <button type="submit" className="btn-secondary">Sign out</button>
        </form>
      </header>

      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        <Stat label="Waiting" value={stats.waiting} />
        <Stat label="With staff" value={stats.called} />
        <Stat label="Seen" value={stats.seen} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setShowPriorityForm((v) => !v)}
        >
          {showPriorityForm ? "Cancel priority insert" : "+ Priority insert"}
        </button>
      </div>

      {showPriorityForm && (
        <PriorityInsertForm onDone={() => setShowPriorityForm(false)} />
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Active queue</h2>
        {active.length === 0 ? (
          <p className="mt-3 rounded-lg bg-slate-50 p-6 text-center text-slate-500">
            No patients waiting.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200">
            {active.map((e) => {
              const stream = streamFor(e.visit_type);
              return (
                <li
                  key={e.id}
                  className={`grid grid-cols-1 gap-3 p-4 sm:grid-cols-[3.5rem_1fr_auto] sm:items-center ${
                    e.priority ? "border-l-4 border-red-500 bg-red-50/40" : ""
                  }`}
                >
                  <div className="flex flex-col items-start">
                    <span className="text-2xl font-bold text-brand">
                      {e.ticket_number ?? "—"}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      {STREAM_LABELS[stream]}
                    </span>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-semibold">{e.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${statusBadge(e.status)}`}
                      >
                        {e.status}
                      </span>
                      {e.priority && (
                        <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold uppercase text-white">
                          Priority
                        </span>
                      )}
                      {e.transferred_from && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          ← {e.transferred_from}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {e.visit_type} ·{" "}
                      {(e as { id_type?: string }).id_type === "passport" ? "Passport" : "National ID"}:{" "}
                      {(e as { id_number?: string }).id_number} · Ref:{" "}
                      <span className="font-mono tracking-widest">{e.token}</span>
                    </p>
                    {e.priority && e.priority_reason && (
                      <p className="mt-1 text-xs text-red-700">
                        Priority reason: {e.priority_reason}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
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
                    {(e.status === "called" || e.status === "preparing") && (
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={pending}
                        onClick={() => submitAction(markSeenAction, e.id)}
                      >
                        Mark seen
                      </button>
                    )}
                    <div className="relative">
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={pending}
                        onClick={() =>
                          setOpenTransferFor((curr) => (curr === e.id ? null : e.id))
                        }
                      >
                        Move to…
                      </button>
                      {openTransferFor === e.id && (
                        <div className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-slate-200 bg-white shadow-lg">
                          {VISIT_TYPES.filter((v) => v.value !== e.visit_type).map((v) => (
                            <button
                              key={v.value}
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                              onClick={() => handleTransfer(e.id, v.value)}
                            >
                              {v.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
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
                <span>
                  <span className="font-mono text-slate-400">#{e.ticket_number ?? "—"}</span>{" "}
                  {e.name}
                </span>
                <span className="text-slate-400">
                  {e.seen_at ? formatTime(e.seen_at) : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {role === "admin" && (
        <section className="mt-10 rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-800">Reset today&apos;s queue</h2>
          <p className="mt-2 text-sm text-red-900">
            Deletes every entry created today. Admin-only.
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
      )}
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

function PriorityInsertForm({ onDone }: { onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(fd: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await priorityInsertAction(fd);
        onDone();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Priority insert failed");
      }
    });
  }

  return (
    <form
      action={onSubmit}
      className="mt-4 rounded-lg border border-red-200 bg-red-50/60 p-4"
    >
      <p className="text-sm font-semibold text-red-800">
        Priority insert (police / prison officer / emergency)
      </p>
      <p className="mt-1 text-xs text-red-700">
        Placed at the front of the chosen queue. Not shown on the public display.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <input
          name="name"
          required
          placeholder="Patient name"
          className="field-input"
        />
        <input
          name="id_number"
          placeholder="ID (optional)"
          className="field-input"
        />
        <select name="visit_type" required defaultValue="general" className="field-input">
          {VISIT_TYPES.map((v) => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
        <input
          name="reason"
          required
          placeholder="Reason (e.g. police escort)"
          className="field-input"
        />
        <input type="hidden" name="id_type" value="national_id" />
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={pending} className="btn-danger">
          {pending ? "Inserting…" : "Insert at front of queue"}
        </button>
        <button type="button" onClick={onDone} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
