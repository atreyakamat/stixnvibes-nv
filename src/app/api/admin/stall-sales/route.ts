import { json, readJson } from "@/lib/api";
import { getAdmin } from "@/lib/admin/session";
import { syncStallSales } from "@/lib/admin/stall-sync";
import { syncSchema } from "@/lib/stall";
import { getStoreOrNull } from "@/lib/store";

// Stall mode sync. The phone keeps sales in a queue while there's no signal
// and posts them here when it's back online. Each sale carries an id made on
// the phone, so a retry after a dropped response never counts a sale twice.
//
//   POST /api/admin/stall-sales  { sales: StallSale[] }  (admin cookie)
//   → { results: [{ id, ok: true, created } | { id, ok: false, error }] }

export const dynamic = "force-dynamic";

/** Only the shop's own pages may post here (the admin cookie is same-site anyway). */
function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Forbidden" }, 403);
  if (!(await getAdmin())) return json({ error: "Log in to the admin again, then sync." }, 401);
  const store = getStoreOrNull();
  if (!store) return json({ error: "Store not configured" }, 503);

  const body = syncSchema.safeParse(await readJson(req));
  if (!body.success) return json({ error: "Send { sales: [...] } with 1 to 200 sales." }, 400);

  return json({ results: await syncStallSales(store, body.data.sales) });
}
