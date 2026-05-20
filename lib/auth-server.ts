import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getServerSupabase } from "./supabase-server";
import { isOfflineMode } from "./offline/mode";
import { offlineServerClient } from "./offline/client";
import type { StaffRole, StaffUser } from "./types";

export function createSSRClient() {
  if (isOfflineMode()) {
    return offlineServerClient() as unknown as ReturnType<typeof createServerClient>;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase env vars missing for SSR client");
  }
  const cookieStore = cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try { cookieStore.set({ name, value, ...options }); } catch { /* ignore */ }
      },
      remove(name: string, options: CookieOptions) {
        try { cookieStore.set({ name, value: "", ...options }); } catch { /* ignore */ }
      },
    },
  });
}

export async function getStaffSession(): Promise<StaffUser | null> {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = getServerSupabase();
  const { data, error } = await admin
    .from("staff_users")
    .select("id, email, role")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data as StaffUser;
}

export async function requireRole(allowed: StaffRole[]): Promise<StaffUser> {
  const session = await getStaffSession();
  if (!session || !allowed.includes(session.role)) {
    throw new Error("Not authorised");
  }
  return session;
}
