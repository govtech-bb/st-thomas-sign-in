import { NextResponse } from "next/server";
import { listTodayEntries } from "@/lib/queue";
import { toDisplayEntry } from "@/lib/queue-client";

export const dynamic = "force-dynamic";

// Public waiting-room display feed, sanitized via the same projection as
// the initial server render: no tokens, ID numbers/types, staff notes, or
// priority reasons. Called patients' names are announced on the display by
// design.
export async function GET() {
  try {
    const entries = await listTodayEntries();
    return NextResponse.json({ entries: entries.map(toDisplayEntry) });
  } catch (err) {
    console.error("GET /api/display failed", err);
    return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  }
}
