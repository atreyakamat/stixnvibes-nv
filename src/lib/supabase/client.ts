import { createBrowserClient } from "@supabase/ssr";

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return { supabaseUrl, supabaseAnonKey };
}

function isValidHttpUrl(url: string): boolean {
  try {
    if (!url || url.includes("YOUR_") || url.includes("PLACEHOLDER")) return false;
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** True when client env vars are available. */
export function isSupabaseConfigured(): boolean {
  const { supabaseUrl, supabaseAnonKey } = getEnv();
  return isValidHttpUrl(supabaseUrl) && Boolean(supabaseAnonKey);
}

/**
 * Browser Supabase client. Safe to import in client components.
 */
export function createBrowser() {
  const { supabaseUrl, supabaseAnonKey } = getEnv();
  if (!isValidHttpUrl(supabaseUrl) || !supabaseAnonKey) return null;
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
