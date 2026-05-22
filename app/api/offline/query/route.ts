import { NextResponse } from "next/server";
import { isOfflineMode } from "@/lib/offline/mode";
import { executeQuery, type QueryRequest } from "@/lib/offline/engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isOfflineMode()) {
    return NextResponse.json({ error: { message: "offline mode disabled" } }, { status: 400 });
  }
  const body = (await req.json()) as QueryRequest & { selectArg?: string };
  const result = executeQuery(body, body.selectArg ?? "*");
  return NextResponse.json(result);
}
