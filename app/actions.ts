"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createEntry, callEntry, markSeen, resetToday } from "@/lib/queue";
import { isStaffAuthenticated, verifyPin, STAFF_COOKIE } from "@/lib/staff";
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

export async function staffLoginAction(formData: FormData): Promise<void> {
  const pin = String(formData.get("pin") ?? "");
  if (!verifyPin(pin)) {
    redirect("/staff?error=1");
  }
  cookies().set(STAFF_COOKIE, pin, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  redirect("/staff");
}

export async function staffLogoutAction(): Promise<void> {
  cookies().delete(STAFF_COOKIE);
  redirect("/staff");
}

function requireStaff() {
  if (!isStaffAuthenticated()) {
    throw new Error("Not authorised");
  }
}

export async function callPatientAction(formData: FormData): Promise<void> {
  requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");
  await callEntry(id);
  revalidatePath("/staff");
}

export async function markSeenAction(formData: FormData): Promise<void> {
  requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");
  await markSeen(id);
  revalidatePath("/staff");
}

export async function resetDayAction(): Promise<void> {
  requireStaff();
  await resetToday();
  revalidatePath("/staff");
}
