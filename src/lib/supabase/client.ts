import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Browser-side Supabase client (uses cookies for auth via @supabase/ssr).
 * Safe to import in client components.
 */
export function createBrowser() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Service-role client for server-side privileged operations ONLY.
 * NEVER expose this to the client. Guard usage carefully in route handlers / server actions.
 */
export function createService() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return null;
  }
  return createSupabaseClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
