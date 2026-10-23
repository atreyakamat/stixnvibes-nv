import "server-only";

// All server configuration in one place. Nothing here is ever sent to the
// browser; only NEXT_PUBLIC_* values are, and the shop uses none of those for
// secrets.

export type StoreMode = "supabase" | "demo" | "unconfigured";

export function supabaseConfig() {
  const url = process.env.SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return url && serviceKey ? { url, serviceKey } : null;
}

export function storeMode(): StoreMode {
  // Demo mode keeps data in memory. netlify.toml forces it for deploy
  // previews and branch deploys, so a preview can never touch real orders.
  if (process.env.SHOP_DEMO_MODE === "true") return "demo";
  if (supabaseConfig()) return "supabase";
  // Local dev without keys also runs on demo data.
  if (process.env.NODE_ENV !== "production") return "demo";
  return "unconfigured";
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Demo-only admin login, shown on the login page in demo mode. */
export const DEMO_ADMIN = { email: "demo@stixnvibes.com", password: "demo-admin" } as const;

export function sessionSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  if (secret.length >= 32) return secret;
  return storeMode() === "demo" ? "demo-only-session-secret-not-for-production" : null;
}

/** Shared secret InWoice uses to read orders. Empty = the feed is off. */
export function syncToken(): string | null {
  const t = process.env.INWOICE_SYNC_TOKEN ?? "";
  return t.length >= 32 ? t : null;
}
