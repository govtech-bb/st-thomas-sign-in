import { NextResponse } from "next/server";
import { listTodayEntries } from "@/lib/queue";
import { requireRole } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

// Clinical dashboard feed. Staff-only: requires an authenticated clinician
// or admin session. Returns the same full records the server component
// renders initially, so staff can still verify identity details.
export async function GET() {
  try {
    await requireRole(["clinician", "admin"]);
  } catch {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  try {
    const entries = await listTodayEntries();
    return NextResponse.json({ entries });
  } catch (err) {
    console.error("GET /api/staff-queue failed", err);
    return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  }
}
