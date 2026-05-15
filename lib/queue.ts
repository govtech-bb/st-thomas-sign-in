import { getServerSupabase, getAnonServerSupabase } from "./supabase-server";
import { generateToken } from "./token";
import type { QueueEntry } from "./types";

const AVG_MINUTES_PER_PATIENT = 8;
const MAX_TOKEN_ATTEMPTS = 8;

function startOfTodayIso(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

export async function listTodayEntries(): Promise<QueueEntry[]> {
  const supabase = getAnonServerSupabase();
  const { data, error } = await supabase
    .from("queue_entries")
    .select("*")
    .gte("created_at", startOfTodayIso())
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as QueueEntry[];
}

export async function getEntryByToken(token: string): Promise<QueueEntry | null> {
  const supabase = getAnonServerSupabase();
  const { data, error } = await supabase
    .from("queue_entries")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  return (data as QueueEntry | null) ?? null;
}

export interface CreateEntryInput {
  name: string;
  visitType: string;
}

export async function createEntry({
  name,
  visitType,
}: CreateEntryInput): Promise<QueueEntry> {
  const supabase = getServerSupabase();

  const { count, error: countError } = await supabase
    .from("queue_entries")
    .select("id", { count: "exact", head: true })
    .eq("status", "waiting")
    .gte("created_at", startOfTodayIso());
  if (countError) throw countError;

  const position = (count ?? 0) + 1;

  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_TOKEN_ATTEMPTS; attempt++) {
    const token = generateToken(4);
    const { data, error } = await supabase
      .from("queue_entries")
      .insert({
        token,
        name: name.trim(),
        visit_type: visitType,
        position,
        status: "waiting",
      })
      .select("*")
      .single();
    if (!error && data) return data as QueueEntry;
    lastError = error;
    // 23505 = unique_violation -> token collision, retry with a new token.
    if (error && (error as { code?: string }).code !== "23505") {
      throw error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to allocate a unique queue token");
}

export async function callEntry(id: string): Promise<void> {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("queue_entries")
    .update({ status: "called", called_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function markSeen(id: string): Promise<void> {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("queue_entries")
    .update({ status: "seen", seen_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function resetToday(): Promise<void> {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("queue_entries")
    .delete()
    .gte("created_at", startOfTodayIso());
  if (error) throw error;
}

export interface QueueViewModel {
  entry: QueueEntry;
  ahead: number;
  estimatedWaitMinutes: number;
}

export async function getQueueViewForToken(
  token: string,
): Promise<QueueViewModel | null> {
  const entry = await getEntryByToken(token);
  if (!entry) return null;
  return buildView(entry, await listTodayEntries());
}

export function buildView(entry: QueueEntry, today: QueueEntry[]): QueueViewModel {
  const ahead =
    entry.status === "waiting"
      ? today.filter(
          (e) =>
            e.status === "waiting" &&
            new Date(e.created_at).getTime() <
              new Date(entry.created_at).getTime(),
        ).length
      : 0;
  return {
    entry,
    ahead,
    estimatedWaitMinutes: ahead * AVG_MINUTES_PER_PATIENT,
  };
}

export { initials } from "./queue-client";
