import { json } from "@/lib/api";
import { storeMode } from "@/lib/env";
import { getStoreOrNull } from "@/lib/store";

// For the home lab's Uptime Kuma. 200 when the shop can read its database,
// 503 when it can't. Says nothing else about the setup.
//
//   GET /api/health  ->  { ok, store: "supabase" | "demo" | "unconfigured" }

export const dynamic = "force-dynamic";

export async function GET() {
  const mode = storeMode();
  const store = getStoreOrNull();
  if (!store) return json({ ok: false, store: mode }, 503);
  try {
    await store.getSettings();
    return json({ ok: true, store: mode });
  } catch {
    return json({ ok: false, store: mode }, 503);
  }
}
