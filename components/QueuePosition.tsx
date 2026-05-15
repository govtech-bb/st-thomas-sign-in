"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import type { QueueEntry, QueueStatus } from "@/lib/types";

const AVG_MINUTES_PER_PATIENT = 8;

interface Props {
  initialEntry: QueueEntry;
  initialAhead: number;
}

interface State {
  status: QueueStatus;
  ahead: number;
  createdAt: string;
}

export function QueuePosition({ initialEntry, initialAhead }: Props) {
  const [state, setState] = useState<State>({
    status: initialEntry.status,
    ahead: initialAhead,
    createdAt: initialEntry.created_at,
  });

  useEffect(() => {
    const supabase = getBrowserSupabase();
    const myCreated = new Date(initialEntry.created_at).getTime();

    async function refresh() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [{ data: meRow }, { data: aheadRows }] = await Promise.all([
        supabase
          .from("queue_entries")
          .select("status, created_at")
          .eq("id", initialEntry.id)
          .maybeSingle(),
        supabase
          .from("queue_entries")
          .select("id, created_at")
          .eq("status", "waiting")
          .gte("created_at", today.toISOString())
          .lt("created_at", initialEntry.created_at),
      ]);

      setState((prev) => {
        if (!meRow) return prev;
        const status = (meRow.status as QueueStatus) ?? prev.status;
        return {
          status,
          ahead: status === "waiting" ? (aheadRows?.length ?? 0) : 0,
          createdAt: prev.createdAt,
        };
      });
    }

    void refresh();

    const channel = supabase
      .channel(`queue:${initialEntry.id}`)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEntry.id]);

  if (state.status === "called") {
    return (
      <section className="rounded-xl bg-amber-100 p-8 text-center ring-4 ring-amber-400">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
          You&apos;re being called
        </p>
        <h2 className="mt-3 text-3xl font-bold text-amber-900">
          Please go to the desk
        </h2>
        <p className="mt-3 text-amber-900">
          A member of staff is ready to see you. If you can&apos;t make it,
          let the front desk know.
        </p>
      </section>
    );
  }

  if (state.status === "seen") {
    return (
      <section className="rounded-xl bg-brand-light p-8 text-center">
        <h2 className="text-2xl font-bold text-brand-dark">
          You have been seen
        </h2>
        <p className="mt-3 text-slate-700">
          Thank you for visiting St Thomas OPC. Have a safe journey home.
        </p>
      </section>
    );
  }

  const position = state.ahead + 1;
  const wait = state.ahead * AVG_MINUTES_PER_PATIENT;

  return (
    <section className="rounded-xl bg-brand-light p-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand">
        Your queue position
      </p>
      <p className="mt-2 text-7xl font-bold text-brand-dark">{position}</p>
      <p className="mt-3 text-slate-700">
        {state.ahead === 0
          ? "You're next."
          : `${state.ahead} ${state.ahead === 1 ? "person" : "people"} ahead of you`}
      </p>
      {state.ahead > 0 && (
        <p className="mt-1 text-sm text-slate-500">
          Estimated wait: about {wait} minute{wait === 1 ? "" : "s"}
        </p>
      )}
    </section>
  );
}
