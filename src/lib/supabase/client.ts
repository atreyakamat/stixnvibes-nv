import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const configured = Boolean(supabaseUrl && supabaseAnonKey);

/** True when client env vars are available (returns a boolean — NOT a function). */
export function isSupabaseConfigured(): boolean {
  return configured;
}

/**
 * Browser Supabase client. Safe to import in client components.
 * Returns null when env vars missing so feature code can gracefully degrade
 * (e.g. consult mock data instead of throwing).
 */
export function createBrowser() {
  if (!configured) return null;
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
