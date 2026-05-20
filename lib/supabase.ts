"use client";

import { createBrowserClient } from "@supabase/ssr";
import { isOfflineMode } from "./offline/mode";
import { getOfflineBrowserClient } from "./offline/browser-client";

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabase() {
  if (isOfflineMode()) {
    return getOfflineBrowserClient() as unknown as ReturnType<typeof createBrowserClient>;
  }
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase env vars missing on the client");
  }
  cached = createBrowserClient(url, key);
  return cached;
}
