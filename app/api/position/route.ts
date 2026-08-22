import { NextRequest, NextResponse } from "next/server";
import { getQueueViewForToken } from "@/lib/queue";
import { isPlausibleToken } from "@/lib/token";

export const dynamic = "force-dynamic";

// Patient personal-page poll. The queue token acts as the only credential:
// responses are scoped to that single entry and never include other
// patients' data.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!isPlausibleToken(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  try {
    const view = await getQueueViewForToken(token);
    if (!view) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { entry, ahead, estimatedWaitMinutes } = view;
    return NextResponse.json({
      status: entry.status,
      ahead,
      estimatedWaitMinutes,
      visitType: entry.visit_type,
      createdAt: entry.created_at,
    });
  } catch (err) {
    console.error("GET /api/position failed", err);
    return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  }
}
