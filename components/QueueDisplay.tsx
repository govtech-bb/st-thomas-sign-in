"use client";

import { useEffect, useMemo, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import type { QueueEntry } from "@/lib/types";
import { initials } from "@/lib/queue-client";

interface Props {
  initialEntries: QueueEntry[];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function waitMinutes(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

export function QueueDisplay({ initialEntries }: Props) {
  const [entries, setEntries] = useState<QueueEntry[]>(initialEntries);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

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
      .channel("queue:display")
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

  const { calledNow, waiting } = useMemo(() => {
    return {
      calledNow: entries.filter((e) => e.status === "called"),
      waiting: entries
        .filter((e) => e.status === "waiting")
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        ),
    };
  }, [entries]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-10 py-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
          St Thomas OPC
        </p>
        <h1 className="mt-1 text-4xl font-bold">Patient Queue</h1>
      </header>

      <div className="grid gap-10 px-10 py-10 lg:grid-cols-[1fr_2fr]">
        <section>
          <h2 className="text-2xl font-semibold text-slate-300">Now calling</h2>
          {calledNow.length === 0 ? (
            <p className="mt-4 rounded-lg bg-slate-900 px-6 py-8 text-xl text-slate-500">
              Nobody is being called right now.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {calledNow.map((e) => (
                <li
                  key={e.id}
                  className="rounded-lg bg-amber-400 px-6 py-6 text-slate-950"
                >
                  <div className="text-5xl font-bold">{initials(e.name)}</div>
                  <div className="mt-2 text-xl font-semibold capitalize">
                    {e.visit_type}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-slate-300">Waiting</h2>
          {waiting.length === 0 ? (
            <p className="mt-4 rounded-lg bg-slate-900 px-6 py-8 text-xl text-slate-500">
              The queue is empty. Welcome in.
            </p>
          ) : (
            <ol className="mt-4 divide-y divide-slate-800 rounded-lg bg-slate-900">
              {waiting.map((e, idx) => (
                <li
                  key={e.id}
                  className="grid grid-cols-[4rem_5rem_1fr_8rem_8rem] items-center gap-6 px-6 py-5"
                >
                  <span className="text-4xl font-bold text-brand">{idx + 1}</span>
                  <span className="text-3xl font-bold">{initials(e.name)}</span>
                  <span className="text-xl capitalize text-slate-300">
                    {e.visit_type}
                  </span>
                  <span className="text-lg text-slate-400">
                    Arrived {formatTime(e.created_at)}
                  </span>
                  <span className="text-lg text-slate-400">
                    {waitMinutes(e.created_at, now)} min waiting
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
