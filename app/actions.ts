"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  callEntry,
  createEntry,
  findEntryByIdNumber,
  markSeen,
  priorityInsert,
  resetToday,
  setPharmacyNote,
  setPreparing,
  transferEntry,
} from "@/lib/queue";
import { createSSRClient, getStaffSession, requireRole } from "@/lib/auth-server";
import { VISIT_TYPE_VALUES } from "@/lib/types";
import type { HasPrescription, StaffRole } from "@/lib/types";

const PRESCRIPTION_VALUES: HasPrescription[] = ["yes", "no", "electronic"];

function actorFromSession(session: { id: string; email: string } | null) {
  return {
    id: session?.id ?? null,
    label: session?.email ?? null,
  };
}

// --- Sign-in (public) ------------------------------------------------------

export async function signInAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const idType = String(formData.get("id_type") ?? "").trim();
  const idNumber = String(formData.get("id_number") ?? "").trim();
  const visitType = String(formData.get("visit_type") ?? "").trim();
  const rawPrescription = String(formData.get("has_prescription") ?? "").trim();

  if (!name) throw new Error("Name is required");
  if (!idNumber) throw new Error("ID number is required");
  if (!["national_id", "passport"].includes(idType)) throw new Error("Please select an ID type");
  if (!VISIT_TYPE_VALUES.includes(visitType as (typeof VISIT_TYPE_VALUES)[number])) {
    throw new Error("Please choose a visit type");
  }

  const hasPrescription =
    visitType === "pharmacy" && PRESCRIPTION_VALUES.includes(rawPrescription as HasPrescription)
      ? (rawPrescription as HasPrescription)
      : null;

  const entry = await createEntry({ name, idType, idNumber, visitType, hasPrescription });
  redirect(`/queue/${entry.token}`);
}

// --- Staff auth ------------------------------------------------------------

export async function staffLoginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    redirect("/staff?error=missing");
  }

  const supabase = createSSRClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect("/staff?error=invalid");
  }

  const session = await getStaffSession();
  if (!session) {
    redirect("/staff?error=unprovisioned");
  }

  redirect(session.role === "pharmacist" ? "/pharmacy" : "/staff");
}

export async function staffLogoutAction(): Promise<void> {
  const supabase = createSSRClient();
  await supabase.auth.signOut();
  redirect("/staff");
}

// --- Staff actions ---------------------------------------------------------

async function requireStaffRole(allowed: StaffRole[]) {
  return requireRole(allowed);
}

export async function callPatientAction(formData: FormData): Promise<void> {
  const session = await requireStaffRole(["clinician", "pharmacist", "admin"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");
  await callEntry(id, actorFromSession(session));
  revalidatePath("/staff");
  revalidatePath("/pharmacy");
}

export async function markSeenAction(formData: FormData): Promise<void> {
  const session = await requireStaffRole(["clinician", "pharmacist", "admin"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");
  await markSeen(id, actorFromSession(session));
  revalidatePath("/staff");
  revalidatePath("/pharmacy");
}

export async function setPreparingAction(formData: FormData): Promise<void> {
  const session = await requireStaffRole(["pharmacist", "admin"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");
  await setPreparing(id, actorFromSession(session));
  revalidatePath("/pharmacy");
}

export async function savePharmacyNoteAction(formData: FormData): Promise<void> {
  const session = await requireStaffRole(["pharmacist", "admin"]);
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "");
  if (!id) throw new Error("Missing id");
  await setPharmacyNote(id, note, actorFromSession(session));
  revalidatePath("/pharmacy");
}

export async function resetDayAction(): Promise<void> {
  const session = await requireStaffRole(["admin"]);
  await resetToday(actorFromSession(session));
  revalidatePath("/staff");
  revalidatePath("/pharmacy");
}

export async function staffTransferAction(formData: FormData): Promise<void> {
  const session = await requireStaffRole(["clinician", "pharmacist", "admin"]);
  const id = String(formData.get("id") ?? "");
  const newVisitType = String(formData.get("visit_type") ?? "");
  const rawPrescription = String(formData.get("has_prescription") ?? "");
  if (!id) throw new Error("Missing id");
  if (!VISIT_TYPE_VALUES.includes(newVisitType as (typeof VISIT_TYPE_VALUES)[number])) {
    throw new Error("Invalid visit type");
  }
  const hasPrescription =
    PRESCRIPTION_VALUES.includes(rawPrescription as HasPrescription)
      ? (rawPrescription as HasPrescription)
      : null;
  await transferEntry({
    id,
    newVisitType,
    hasPrescription,
    actorId: session.id,
    actorLabel: session.email,
  });
  revalidatePath("/staff");
  revalidatePath("/pharmacy");
}

export async function priorityInsertAction(formData: FormData): Promise<void> {
  const session = await requireStaffRole(["clinician", "pharmacist", "admin"]);
  const name = String(formData.get("name") ?? "").trim();
  const idType = String(formData.get("id_type") ?? "national_id");
  const idNumber = String(formData.get("id_number") ?? "").trim();
  const visitType = String(formData.get("visit_type") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!name) throw new Error("Name is required");
  if (!reason) throw new Error("Priority reason is required");
  if (!VISIT_TYPE_VALUES.includes(visitType as (typeof VISIT_TYPE_VALUES)[number])) {
    throw new Error("Invalid visit type");
  }
  await priorityInsert({
    name,
    idType,
    idNumber,
    visitType,
    reason,
    actorId: session.id,
    actorLabel: session.email,
  });
  revalidatePath("/staff");
  revalidatePath("/pharmacy");
}

// --- Patient-facing actions ------------------------------------------------

export async function lookupPatientAction(formData: FormData): Promise<void> {
  const idNumber = String(formData.get("id_number") ?? "").trim();
  if (!idNumber) throw new Error("Please enter your ID number");
  const entry = await findEntryByIdNumber(idNumber);
  if (!entry) throw new Error("No active queue entry found for that ID number today.");
  redirect(`/queue/${entry.token}`);
}

// Patients can no longer self-transfer (clinic feedback after the May 19
// demo). All transfers now go through the staff/pharmacist dashboard via
// staffTransferAction above.
