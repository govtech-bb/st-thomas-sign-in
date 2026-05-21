"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase";
import type { QueueEntry, QueueStatus } from "@/lib/types";
import { streamFor } from "@/lib/types";

const AVG_MINUTES_PER_PATIENT = 8;
const KIOSK_TIMEOUT_SECONDS = 10;

interface Props {
  initialEntry: QueueEntry;
  initialAhead: number;
}

interface State {
  status: QueueStatus;
  ahead: number;
  visitType: string;
  createdAt: string;
}

export function QueuePosition({ initialEntry, initialAhead }: Props) {
  const router = useRouter();
  const [state, setState] = useState<State>({
    status: initialEntry.status,
    ahead: initialAhead,
    visitType: initialEntry.visit_type,
    createdAt: initialEntry.created_at,
  });
  const [kioskSecondsLeft, setKioskSecondsLeft] = useState<number | null>(null);
  const kioskTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const isKiosk =
      typeof window !== "undefined" && localStorage.getItem("kiosk") === "true";
    if (!isKiosk) return;

    setKioskSecondsLeft(KIOSK_TIMEOUT_SECONDS);
    let remaining = KIOSK_TIMEOUT_SECONDS;

    kioskTimerRef.current = setInterval(() => {
      remaining -= 1;
      setKioskSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(kioskTimerRef.current!);
        router.push("/");
      }
    }, 1000);

    return () => {
      if (kioskTimerRef.current) clearInterval(kioskTimerRef.current);
    };
  }, [router]);

  useEffect(() => {
    const supabase = getBrowserSupabase();

    async function refresh() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: meRow } = await supabase
        .from("queue_entries")
        .select("status, created_at, visit_type")
        .eq("id", initialEntry.id)
        .maybeSingle();

      if (!meRow) return;

      const myStream = streamFor(meRow.visit_type as string);
      const { data: aheadRows } = await supabase
        .from("queue_entries")
        .select("id, priority, created_at, visit_type")
        .eq("status", "waiting")
        .gte("created_at", today.toISOString());

      const filteredAhead = (aheadRows ?? []).filter((r) => {
        if (streamFor((r as { visit_type: string }).visit_type) !== myStream) return false;
        if ((r as { priority?: boolean }).priority) return true;
        return (
          new Date((r as { created_at: string }).created_at).getTime() <
          new Date(meRow.created_at as string).getTime()
        );
      });

      setState({
        status: (meRow.status as QueueStatus) ?? "waiting",
        ahead: meRow.status === "waiting" ? filteredAhead.length : 0,
        visitType: meRow.visit_type as string,
        createdAt: meRow.created_at as string,
      });
    }

    void refresh();

    const channel = supabase
      .channel(`queue:${initialEntry.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_entries" },
        () => { void refresh(); },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEntry.id]);

  const kioskBanner = kioskSecondsLeft !== null && (
    <div className="mt-6 flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">
      <span>Returning to check-in in {kioskSecondsLeft}s&hellip;</span>
      <button
        onClick={() => router.push("/")}
        className="ml-4 rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white"
      >
        Check in another patient
      </button>
    </div>
  );

  if (state.status === "called" || state.status === "preparing") {
    const isPharmacy = streamFor(state.visitType) === "pharmacy";
    return (
      <>
        <section className="rounded-xl bg-amber-100 p-8 text-center ring-4 ring-amber-400">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
            {state.status === "preparing"
              ? "Pharmacist is preparing your order"
              : "You're being called"}
          </p>
          <h2 className="mt-3 text-3xl font-bold text-amber-900">
            Please go to {isPharmacy ? "the pharmacy window" : "the desk"}
          </h2>
        </section>
        {kioskBanner}
      </>
    );
  }

  if (state.status === "seen") {
    return (
      <>
        <section className="rounded-xl bg-brand-light p-8 text-center">
          <h2 className="text-2xl font-bold text-brand-dark">You have been seen</h2>
          <p className="mt-3 text-slate-700">Thank you for visiting St Thomas OPC.</p>
        </section>
        {kioskBanner}
      </>
    );
  }

  const position = state.ahead + 1;
  const wait = state.ahead * AVG_MINUTES_PER_PATIENT;

  return (
    <>
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
      {kioskBanner}
    </>
  );
}
