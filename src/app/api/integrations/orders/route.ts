import { bearerMatches, json } from "@/lib/api";
import { syncToken } from "@/lib/env";
import { orderUrl } from "@/lib/orders";
import { getStoreOrNull } from "@/lib/store";

// Read-only feed of orders for InWoice (invoicing + CRM on the home server).
// InWoice pulls instead of the shop pushing, so when the home server is off
// (power cut) nothing is lost: it picks up from its last `since` when it's back.
//
//   GET /api/integrations/orders?since=<ISO>&limit=100
//   Authorization: Bearer <INWOICE_SYNC_TOKEN>
//
// Orders come oldest change first. Pass the returned `next` as `since` on the
// next call; an order shows up again whenever its status changes.

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = syncToken();
  // No token configured = the feed doesn't exist.
  if (!token) return json({ error: "Not found" }, 404);
  if (!bearerMatches(req, token)) return json({ error: "Unauthorised" }, 401);
  const store = getStoreOrNull();
  if (!store) return json({ error: "Store not configured" }, 503);

  const url = new URL(req.url);
  const sinceRaw = url.searchParams.get("since");
  // Kept as sent (not re-formatted) so microseconds from the database survive
  // and the last order isn't returned again.
  const since = sinceRaw && sinceRaw.length <= 40 && !Number.isNaN(Date.parse(sinceRaw)) ? sinceRaw : "1970-01-01T00:00:00.000Z";
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 100));

  const orders = await store.listOrders({ updatedSince: since, limit });
  return json({
    orders: orders.map(({ viewKey, ...o }) => ({ ...o, pageUrl: viewKey ? orderUrl({ number: o.number, viewKey }) : null })),
    next: orders.length ? orders[orders.length - 1].updatedAt : since,
    hasMore: orders.length === limit,
  });
}
