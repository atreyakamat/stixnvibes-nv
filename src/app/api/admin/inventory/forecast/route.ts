import { createApiHandler } from "@/lib/api-handler";
import { createService } from "@/lib/supabase/service";
import { z } from "zod";

function csvEscape(value: unknown) {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const GET = createApiHandler({
  requireAdmin: true,
  querySchema: z.object({
    days: z.coerce.number().min(7).max(180).optional().default(30),
    buffer: z.coerce.number().min(0).max(1).optional().default(0.2),
  }),
  handler: async ({ query }) => {
    const days = query.days;
    const bufferPct = query.buffer;
    const admin = createService();

    if (!admin) {
      const csv = [
        "sku,name,current_stock,sold_30d,expected_30d,restock_required,supplier_note",
        "NO-DATA,Awaiting Supabase env vars,0,0,0,0,configure NEXT_PUBLIC_SUPABASE_URL",
      ].join("\n");
      return new Response(csv, {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="snv-inventory-forecast-${days}d.csv"`,
        },
      });
    }

    const client = admin;
    const sinceIso = new Date(Date.now() - days * 86400_000).toISOString();

    const [productsRes, itemsRes] = await Promise.all([
      client.from("products").select("id, name, slug, stock"),
      client
        .from("order_items")
        .select("product_id, quantity, orders!inner(created_at, status)")
        .gte("orders.created_at", sinceIso)
        .in("orders.status", ["paid", "confirmed", "fulfilled", "sent"])
        .limit(5000),
    ]);

    if (productsRes.error || itemsRes.error) {
      throw new Error(productsRes.error?.message ?? itemsRes.error?.message ?? "Query failed");
    }

    const sales: Record<string, number> = {};
    for (const row of (itemsRes.data ?? []) as { product_id: string | null; quantity: number }[]) {
      if (!row.product_id) continue;
      sales[row.product_id] = (sales[row.product_id] ?? 0) + (row.quantity ?? 0);
    }

    const rows = (productsRes.data ?? []) as { id: string; name: string; slug: string; stock: number }[];
    const headers = [
      "sku",
      "name",
      "current_stock",
      `sold_${days}d`,
      "expected_next_period",
      "restock_required",
      "supplier_note",
    ];
    const lines: string[] = [headers.join(",")];

    for (const p of rows) {
      const sold = sales[p.id] ?? 0;
      const expected = Math.ceil(sold * (1 + bufferPct));
      const gap = Math.max(0, expected - (p.stock ?? 0));
      const note = gap > 0 ? "RESTOCK" : "OK";
      lines.push(
        [
          csvEscape(p.slug),
          csvEscape(p.name),
          csvEscape(p.stock ?? 0),
          csvEscape(sold),
          csvEscape(expected),
          csvEscape(gap),
          csvEscape(note),
        ].join(",")
      );
    }

    const csv = lines.join("\n");
    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="snv-inventory-forecast-${days}d.csv"`,
      },
    });
  },
});
