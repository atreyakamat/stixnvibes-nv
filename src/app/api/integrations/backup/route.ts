import { bearerMatches, json } from "@/lib/api";
import { backupToken } from "@/lib/env";
import { getStoreOrNull } from "@/lib/store";

// A full copy of the shop's data for the home lab backup job (homelab/).
// Products, collections, offers, orders, stalls and sales, posts, the photo
// library, colleges and settings, as one JSON file. Photos stay in Supabase
// Storage; their links are in the copy.
//
//   GET /api/integrations/backup
//   Authorization: Bearer <BACKUP_TOKEN>

export const dynamic = "force-dynamic";
export const maxDuration = 26;

export async function GET(req: Request) {
  const token = backupToken();
  // No token configured = backups are off and the route doesn't exist.
  if (!token) return json({ error: "Not found" }, 404);
  if (!bearerMatches(req, token)) return json({ error: "Unauthorised" }, 401);
  const store = getStoreOrNull();
  if (!store) return json({ error: "Store not configured" }, 503);
  try {
    const data = await store.exportAll();
    return json({ version: 1, exportedAt: new Date().toISOString(), data });
  } catch (err) {
    console.error("[backup]", err);
    return json({ error: "Export failed" }, 500);
  }
}
