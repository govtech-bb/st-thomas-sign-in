"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createEntry, callEntry, markSeen, resetToday } from "@/lib/queue";
import {
  isStaffAuthenticated,
  verifyPin,
  createStaffSession,
  deleteStaffSession,
  StaffPinConfigError,
  STAFF_COOKIE,
} from "@/lib/staff";
import { getServerSupabase } from "@/lib/supabase-server";
import { VISIT_TYPE_VALUES } from "@/lib/types";

export async function signInAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const visitType = String(formData.get("visit_type") ?? "").trim();
  if (!name) throw new Error("Name is required");
  if (!VISIT_TYPE_VALUES.includes(visitType as (typeof VISIT_TYPE_VALUES)[number])) {
    throw new Error("Please choose a visit type");
  }
  const entry = await createEntry({ name, visitType });
  redirect(`/queue/${entry.token}`);
}

function getClientIp(): string {
  const fwd = headers().get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers().get("x-real-ip")?.trim() || "unknown";
}

// Exponential backoff: lock window (ms) keyed by failure count after the
// current attempt has been recorded. Caps at 1 hour.
function backoffMs(failureCount: number): number {
  if (failureCount <= 3) return 0;
  if (failureCount === 4) return 30 * 1000;
  if (failureCount === 5) return 2 * 60 * 1000;
  if (failureCount === 6) return 10 * 60 * 1000;
  return 60 * 60 * 1000;
}

async function isIpLocked(ip: string): Promise<boolean> {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from("staff_login_attempts")
    .select("locked_until")
    .eq("ip", ip)
    .maybeSingle();
  if (!data?.locked_until) return false;
  return new Date(data.locked_until).getTime() > Date.now();
}

async function recordLoginFailure(ip: string): Promise<void> {
  const supabase = getServerSupabase();
  const { data: existing } = await supabase
    .from("staff_login_attempts")
    .select("failure_count")
    .eq("ip", ip)
    .maybeSingle();
  const failureCount = (existing?.failure_count ?? 0) + 1;
  const lockMs = backoffMs(failureCount);
  const lockedUntil =
    lockMs > 0 ? new Date(Date.now() + lockMs).toISOString() : null;
  await supabase.from("staff_login_attempts").upsert(
    {
      ip,
      failure_count: failureCount,
      first_failure_at: existing ? undefined : new Date().toISOString(),
      locked_until: lockedUntil,
    },
    { onConflict: "ip" },
  );
}

async function clearLoginFailures(ip: string): Promise<void> {
  const supabase = getServerSupabase();
  await supabase.from("staff_login_attempts").delete().eq("ip", ip);
}

export async function staffLoginAction(formData: FormData): Promise<void> {
  const pin = String(formData.get("pin") ?? "");
  const ip = getClientIp();

  if (await isIpLocked(ip)) {
    redirect("/staff?error=locked");
  }

  let ok = false;
  try {
    ok = verifyPin(pin);
  } catch (err) {
    if (err instanceof StaffPinConfigError) {
      redirect("/staff?error=config");
    }
    throw err;
  }

  if (!ok) {
    await recordLoginFailure(ip);
    redirect("/staff?error=1");
  }

  await clearLoginFailures(ip);
  const sessionId = await createStaffSession();
  cookies().set(STAFF_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  redirect("/staff");
}

export async function staffLogoutAction(): Promise<void> {
  const cookie = cookies().get(STAFF_COOKIE);
  if (cookie?.value) {
    await deleteStaffSession(cookie.value);
  }
  cookies().delete(STAFF_COOKIE);
  redirect("/staff");
}

async function requireStaff(): Promise<void> {
  if (!(await isStaffAuthenticated())) {
    throw new Error("Not authorised");
  }
}

export async function callPatientAction(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");
  await callEntry(id);
  revalidatePath("/staff");
}

export async function markSeenAction(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");
  await markSeen(id);
  revalidatePath("/staff");
}

export async function resetDayAction(): Promise<void> {
  await requireStaff();
  await resetToday();
  revalidatePath("/staff");
}
