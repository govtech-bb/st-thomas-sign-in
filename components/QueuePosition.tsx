"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
    // Polls the token-scoped server endpoint; the browser never touches the
    // queue_entries table directly and never sees other patients' rows.
    async function refresh() {
      try {
        const res = await fetch(
          `/api/position?token=${encodeURIComponent(initialEntry.token)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = await res.json();
        setState({
          status: (data.status as QueueStatus) ?? "waiting",
          ahead: typeof data.ahead === "number" ? data.ahead : 0,
          visitType: data.visitType as string,
          createdAt: data.createdAt as string,
        });
      } catch {
        // Keep showing the last known state on transient errors.
      }
    }

    void refresh();

    const poll = setInterval(() => void refresh(), 5_000);
    return () => clearInterval(poll);
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
