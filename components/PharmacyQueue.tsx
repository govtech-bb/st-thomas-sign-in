"use client";

import { useEffect, useState, useTransition } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import type { QueueEntry, StaffRole } from "@/lib/types";
import { VISIT_TYPES } from "@/lib/types";
import {
  callPatientAction,
  markSeenAction,
  savePharmacyNoteAction,
  setPreparingAction,
  staffLogoutAction,
  staffTransferAction,
} from "@/app/actions";

interface Props {
  initialEntries: QueueEntry[];
  email: string;
  role: StaffRole;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function waitMinutes(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

function idTypeLabel(type: string): string {
  return type === "passport" ? "Passport" : "National ID";
}

function prescriptionLabel(value: string | null): string {
  if (value === "yes") return "Paper in hand";
  if (value === "electronic") return "Electronic on file";
  if (value === "no") return "No prescription";
  return "Not specified";
}

function statusBadgeClass(status: string) {
  if (status === "waiting") return "bg-slate-100 text-slate-700";
  if (status === "called") return "bg-amber-100 text-amber-800";
  if (status === "preparing") return "bg-blue-100 text-blue-800";
  return "bg-emerald-100 text-emerald-800";
}

export function PharmacyQueue({ initialEntries, email, role }: Props) {
  const [entries, setEntries] = useState<QueueEntry[]>(initialEntries);
  const [pending, startTransition] = useTransition();
  const [, setNow] = useState(Date.now());
  const [openMoveFor, setOpenMoveFor] = useState<string | null>(null);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const supabase = getBrowserSupabase();

    async function refresh() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("queue_entries")
        .select("*")
        .eq("visit_type", "pharmacy")
        .gte("created_at", today.toISOString())
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true });
      setEntries((data ?? []) as QueueEntry[]);
    }

    void refresh();

    const channel = supabase
      .channel("queue:pharmacy")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_entries" }, () => {
        void refresh();
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, []);

  function submitAction(action: (fd: FormData) => Promise<void>, id: string) {
    const fd = new FormData();
    fd.set("id", id);
    startTransition(() => action(fd));
  }

  function handleMove(id: string, visitType: string) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("visit_type", visitType);
    startTransition(() => staffTransferAction(fd));
    setOpenMoveFor(null);
  }

  const active = entries.filter((e) => e.status !== "seen");
  const seen = entries.filter((e) => e.status === "seen");
  const waiting = entries.filter((e) => e.status === "waiting").length;
  const inProgress = entries.filter((e) => e.status === "called" || e.status === "preparing").length;

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">
            St Thomas OPC
          </p>
          <h1 className="mt-1 text-3xl font-bold">Pharmacy Queue</h1>
          <p className="mt-1 text-sm text-slate-500">
            Signed in as {email} ({role})
          </p>
        </div>
        <form action={staffLogoutAction}>
          <button type="submit" className="btn-secondary">Sign out</button>
        </form>
      </header>

      <div className="grid grid-cols-3 gap-4 text-center mb-8">
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="text-3xl font-bold">{waiting}</div>
          <div className="text-sm text-slate-600">Waiting</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="text-3xl font-bold">{inProgress}</div>
          <div className="text-sm text-slate-600">Called / preparing</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="text-3xl font-bold">{seen.length}</div>
          <div className="text-sm text-slate-600">Served</div>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Prescription queue</h2>
        {active.length === 0 ? (
          <p className="rounded-lg bg-slate-50 p-6 text-center text-slate-500">
            No patients waiting.
          </p>
        ) : (
          <ul className="space-y-3">
            {active.map((e) => (
              <li
                key={e.id}
                className={`rounded-lg border p-4 ${
                  e.priority ? "border-red-300 bg-red-50/40" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-2xl font-bold text-brand">#{e.ticket_number ?? "—"}</span>
                  <span className="text-lg font-semibold">{e.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${statusBadgeClass(e.status)}`}>
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
                  {idTypeLabel((e as { id_type?: string }).id_type ?? "")}:{" "}
                  <span className="font-medium text-slate-700">
                    {(e as { id_number?: string }).id_number}
                  </span>
                  {" "}· Ref:{" "}
                  <span className="font-mono tracking-widest">{e.token}</span>
                  {" "}· Arrived {formatTime(e.created_at)}
                  {" "}· {waitMinutes(e.created_at)} min waiting
                </p>
                <p className="mt-1 text-sm">
                  <span className="text-slate-500">Prescription: </span>
                  <span className="font-medium">{prescriptionLabel(e.has_prescription)}</span>
                </p>

                <NoteEditor entryId={e.id} initialValue={e.pharmacy_notes ?? ""} />

                <div className="mt-3 flex flex-wrap gap-2">
                  {e.status === "waiting" && (
                    <button
                      onClick={() => submitAction(callPatientAction, e.id)}
                      disabled={pending}
                      className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                    >
                      Call
                    </button>
                  )}
                  {e.status === "called" && (
                    <button
                      onClick={() => submitAction(setPreparingAction, e.id)}
                      disabled={pending}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      Mark preparing
                    </button>
                  )}
                  {(e.status === "called" || e.status === "preparing") && (
                    <button
                      onClick={() => submitAction(markSeenAction, e.id)}
                      disabled={pending}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Mark served
                    </button>
                  )}
                  <div className="relative">
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={pending}
                      onClick={() =>
                        setOpenMoveFor((curr) => (curr === e.id ? null : e.id))
                      }
                    >
                      Move to…
                    </button>
                    {openMoveFor === e.id && (
                      <div className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-slate-200 bg-white shadow-lg">
                        {VISIT_TYPES.filter((v) => v.value !== "pharmacy").map((v) => (
                          <button
                            key={v.value}
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                            onClick={() => handleMove(e.id, v.value)}
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {seen.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-500 mb-3">
            Served today ({seen.length})
          </h2>
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 text-sm text-slate-600">
            {seen.map((e) => (
              <li key={e.id} className="flex items-center justify-between p-3">
                <div>
                  <span className="font-mono text-slate-400">#{e.ticket_number ?? "—"}</span>{" "}
                  <span className="font-medium">{e.name}</span>
                  <span className="ml-2 text-slate-400">
                    {idTypeLabel((e as { id_type?: string }).id_type ?? "")}: {(e as { id_number?: string }).id_number}
                  </span>
                </div>
                <span className="text-slate-400">
                  {e.seen_at ? formatTime(e.seen_at) : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function NoteEditor({ entryId, initialValue }: { entryId: string; initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    const fd = new FormData();
    fd.set("id", entryId);
    fd.set("note", value);
    startTransition(async () => {
      await savePharmacyNoteAction(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
        Fulfilment notes
      </label>
      <textarea
        value={value}
        onChange={(ev) => setValue(ev.target.value)}
        rows={2}
        placeholder="e.g. Pulled — awaiting verification"
        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending || value === initialValue}
          className="rounded-md bg-slate-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save note"}
        </button>
        {saved && <span className="text-xs text-emerald-700">Saved.</span>}
      </div>
    </div>
  );
}
