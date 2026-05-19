export type QueueStatus = "waiting" | "called" | "seen";

export type VisitType = "general" | "follow-up" | "pharmacy" | "other";

export interface QueueEntry {
  id: string;
  token: string;
  name: string;
  visit_type: VisitType | string;
  position: number;
  status: QueueStatus;
  created_at: string;
  called_at: string | null;
  seen_at: string | null;
}

export const VISIT_TYPES: { value: VisitType; label: string }[] = [
  { value: "general", label: "General" },
  { value: "follow-up", label: "Follow-up" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "other", label: "Other" },
];

export const VISIT_TYPE_VALUES = VISIT_TYPES.map((v) => v.value);
