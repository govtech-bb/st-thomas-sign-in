"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import type { QueueEntry } from "@/lib/types";
import { initials } from "@/lib/queue-client";

interface Props {
  initialEntries: QueueEntry[];
}

function playChime(ctx: AudioContext) {
  const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = ctx.currentTime + i * 0.18;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.35, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);
    osc.start(start);
    osc.stop(start + 0.65);
  });
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
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  function unlockAudio() {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    // Play a silent buffer to satisfy the user-gesture requirement.
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start();
    setAudioUnlocked(true);
  }
  const calledIdsRef = useRef<Set<string>>(
    new Set(initialEntries.filter((e) => e.status === "called").map((e) => e.id)),
  );

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
      const fresh = (data ?? []) as QueueEntry[];

      // Detect newly called patients and play a chime for each.
      const newlyCalled = fresh.filter(
        (e) => e.status === "called" && !calledIdsRef.current.has(e.id),
      );
      if (newlyCalled.length > 0 && audioCtxRef.current) playChime(audioCtxRef.current);
      calledIdsRef.current = new Set(
        fresh.filter((e) => e.status === "called").map((e) => e.id),
      );

      setEntries(fresh);
    }

    const channel = supabase
      .channel("queue:display")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_entries" },
        () => { void refresh(); },
      )
      .subscribe();

    // Poll every 2 s so updates land within 2 s even if realtime silently fails.
    const poll = setInterval(() => void refresh(), 2_000);

    return () => {
      void supabase.removeChannel(channel);
      clearInterval(poll);
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
      {!audioUnlocked && (
        <button
          onClick={unlockAudio}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-slate-950/90 text-white"
        >
          <span className="text-5xl">🔔</span>
          <span className="text-2xl font-semibold">Tap to enable sound</span>
          <span className="text-slate-400">Required for patient call alerts</span>
        </button>
      )}
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
