import { NextResponse } from "next/server";
import { isOfflineMode } from "@/lib/offline/mode";
import { getStore } from "@/lib/offline/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isOfflineMode()) {
    return NextResponse.json({ rev: 0 });
  }
  return NextResponse.json({ rev: getStore().rev });
}
