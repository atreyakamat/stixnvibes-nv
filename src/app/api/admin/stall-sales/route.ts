import { revalidatePath } from "next/cache";
import { json, readJson } from "@/lib/api";
import { getAdmin } from "@/lib/admin/session";
import { saleSchema, saleTimeProblem, syncSchema, type SyncResult } from "@/lib/stall";
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

  const stallIds = new Set((await store.listStalls()).map((s) => s.id));
  const results: SyncResult[] = [];
  for (const raw of body.data.sales) {
    const parsed = saleSchema.safeParse(raw);
    const id = typeof (raw as { id?: unknown })?.id === "string" ? String((raw as { id: string }).id).slice(0, 64) : "";
    if (!parsed.success) {
      results.push({ id, ok: false, error: parsed.error.issues[0]?.message ?? "Invalid sale.", retry: false });
      continue;
    }
    const sale = parsed.data;
    const timeProblem = saleTimeProblem(sale.soldAt);
    if (timeProblem) {
      results.push({ id: sale.id, ok: false, error: timeProblem, retry: false });
      continue;
    }
    try {
      const { created } = await store.recordStallSale({
        ...sale,
        soldAt: new Date(sale.soldAt).toISOString(),
        // A stall deleted while the phone was offline: keep the sale, unlinked.
        stallId: sale.stallId && stallIds.has(sale.stallId) ? sale.stallId : null,
      });
      results.push({ id: sale.id, ok: true, created });
    } catch (err) {
      console.error("[stall-sales]", err);
      results.push({ id: sale.id, ok: false, error: "Couldn't save this one. It stays on the phone and retries.", retry: true });
    }
  }
  if (results.some((r) => r.ok && r.created)) {
    // Stock changed.
    revalidatePath("/", "layout");
  }
  return json({ results });
}
