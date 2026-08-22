import { NextResponse } from "next/server";
import { listTodayEntries } from "@/lib/queue";
import { requireRole } from "@/lib/auth-server";
import type { QueueEntry } from "@/lib/types";
import { streamFor } from "@/lib/types";

export const dynamic = "force-dynamic";

// Pharmacy dashboard feed. Staff-only: requires an authenticated pharmacist
// or admin session. ID numbers/types are not needed on this screen and are
// stripped before the rows reach the browser.
export async function GET() {
  try {
    await requireRole(["pharmacist", "admin"]);
  } catch {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  try {
    const all = await listTodayEntries();
    const rows = all
      .filter((e: QueueEntry) => streamFor(e.visit_type) === "pharmacy")
      .map((e) => ({
        id: e.id,
        name: e.name,
        visit_type: e.visit_type,
        ticket_number: e.ticket_number,
        status: e.status,
        priority: e.priority,
        pharmacy_notes: e.pharmacy_notes,
        has_prescription: e.has_prescription,
        created_at: e.created_at,
        called_at: e.called_at,
      }));
    return NextResponse.json({ entries: rows });
  } catch (err) {
    console.error("GET /api/pharmacy failed", err);
    return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  }
}
