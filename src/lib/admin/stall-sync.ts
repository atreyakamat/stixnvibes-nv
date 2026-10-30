import "server-only";
import { revalidatePath } from "next/cache";
import { saleSchema, saleTimeProblem, type SyncResult } from "@/lib/stall";
import type { Store } from "@/lib/store";

/**
 * Stores sales queued on a phone in stall mode, one result per sale. Each
 * sale carries an id made on the phone, so a retry after a dropped response
 * never counts a sale twice. Used by the web stall screen and the admin app.
 */
export async function syncStallSales(store: Store, sales: unknown[]): Promise<SyncResult[]> {
  const stallIds = new Set((await store.listStalls()).map((s) => s.id));
  const results: SyncResult[] = [];
  for (const raw of sales) {
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
  return results;
}
