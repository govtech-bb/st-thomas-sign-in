export type QueueStatus = "waiting" | "called" | "preparing" | "seen";

export type VisitType = "general" | "follow-up" | "pharmacy" | "other";

export type IdType = "national_id" | "passport";

export type Stream = "clinical" | "pharmacy";

export type HasPrescription = "yes" | "no" | "electronic";

export type StaffRole = "clinician" | "pharmacist" | "admin";

export interface QueueEntry {
  id: string;
  token: string;
  name: string;
  id_type: IdType | string;
  id_number: string;
  visit_type: VisitType | string;
  position: number;
  ticket_number: number | null;
  status: QueueStatus;
  priority: boolean;
  priority_reason: string | null;
  transferred_from: string | null;
  pharmacy_notes: string | null;
  has_prescription: HasPrescription | null;
  created_at: string;
  called_at: string | null;
  seen_at: string | null;
}

export interface StaffUser {
  id: string;
  email: string;
  role: StaffRole;
}

export interface QueueAuditRow {
  id: number;
  entry_id: string | null;
  actor_id: string | null;
  actor_label: string | null;
  action:
    | "sign_in"
    | "call"
    | "preparing"
    | "seen"
    | "transfer"
    | "priority_insert"
    | "pharmacy_note"
    | "reset_day";
  detail: Record<string, unknown> | null;
  created_at: string;
}

export const VISIT_TYPES: { value: VisitType; label: string; description: string }[] = [
  { value: "general", label: "General", description: "For new health concerns or symptoms you haven't been seen for before." },
  { value: "follow-up", label: "Follow-up", description: "A return visit to check on a previous condition or treatment." },
  { value: "pharmacy", label: "Pharmacy", description: "To collect or enquire about a prescription or medication." },
  { value: "other", label: "Other", description: "For any visit not covered by the options above." },
];

export const VISIT_TYPE_VALUES = VISIT_TYPES.map((v) => v.value);

export const STREAM_LABELS: Record<Stream, string> = {
  clinical: "Doctor",
  pharmacy: "Pharmacy",
};

export function streamFor(visitType: string): Stream {
  return visitType === "pharmacy" ? "pharmacy" : "clinical";
}

export const PRESCRIPTION_OPTIONS: { value: HasPrescription; label: string; description: string }[] = [
  { value: "yes", label: "Yes, paper prescription in hand", description: "I have the paper from my doctor today." },
  { value: "electronic", label: "Electronic prescription on file", description: "My doctor sent it to the pharmacy already." },
  { value: "no", label: "No prescription yet", description: "I'm here to ask about a medication or pick something up without a prescription." },
];
