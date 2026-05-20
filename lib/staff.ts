import { cookies } from "next/headers";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { getServerSupabase } from "@/lib/supabase-server";

export const STAFF_COOKIE = "stq_staff";
const SESSION_TTL_HOURS = 12;

export class StaffPinConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaffPinConfigError";
  }
}

function getValidatedStaffPin(): string {
  const pin = process.env.STAFF_PIN;
  if (!pin) {
    throw new StaffPinConfigError("STAFF_PIN is not set");
  }
  if (pin.length < 6) {
    throw new StaffPinConfigError("STAFF_PIN must be at least 6 characters");
  }
  if (/^\d{1,4}$/.test(pin) || pin === "1234") {
    throw new StaffPinConfigError("STAFF_PIN is too weak");
  }
  return pin;
}

export function verifyPin(pin: string): boolean {
  const expected = getValidatedStaffPin();
  const a = createHash("sha256").update(pin).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function isStaffAuthenticated(): Promise<boolean> {
  const cookie = cookies().get(STAFF_COOKIE);
  const sessionId = cookie?.value;
  if (!sessionId || !UUID_RE.test(sessionId)) return false;

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("staff_sessions")
    .select("id, expires_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (error || !data) return false;
  return new Date(data.expires_at).getTime() > Date.now();
}

export async function createStaffSession(): Promise<string> {
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("staff_sessions")
    .insert({ id, expires_at: expiresAt.toISOString() });
  if (error) {
    throw new Error(`Failed to create staff session: ${error.message}`);
  }
  return id;
}

export async function deleteStaffSession(id: string): Promise<void> {
  if (!UUID_RE.test(id)) return;
  const supabase = getServerSupabase();
  await supabase.from("staff_sessions").delete().eq("id", id);
}
