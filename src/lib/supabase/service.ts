import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** True when both Supabase URL and the service-role key are set server-side. */
export function isServiceConfigured() {
  return Boolean(supabaseUrl && serviceRoleKey);
}

/**
 * Privileged service-role client. NEVER expose to the browser.
 * Use only inside server-only modules: route handlers, server actions, jobs.
 */
export function createService() {
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
