export const dynamic = "force-dynamic";
import { NextResponse, type NextRequest } from "next/server";
import { createService } from "@/lib/supabase/service";

/**
 * Inventory forecast CSV for the back-office.
 *
 * Forecast rule (simple, conservative):
 *   expected_30d_units = historical_orders_units (last 30 days) + 20% buffer
 *   restock_required   = expected_30d_units - current_stock
 *
 * When Supabase isn't configured we return an empty CSV with a header row
 * so the admin download still works offline.
 */

function csvEscape(value: unknown) {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const days = Math.min(180, Math.max(7, Number(req.nextUrl.searchParams.get("days")) || 30));
  const bufferPct = Math.min(1, Math.max(0, Number(req.nextUrl.searchParams.get("buffer")) || 0.2));
  const admin = createService();

  if (!admin) {
    const csv = [
      "sku,name,current_stock,sold_30d,expected_30d,restock_required,supplier_note",
      "NO-DATA,Awaiting Supabase env vars,0,0,0,0,configure NEXT_PUBLIC_SUPABASE_URL",
    ].join("\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="snv-inventory-forecast-${days}d.csv"`,
      },
    });
  }

  const client = admin;
  try {
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
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="snv-inventory-forecast-${days}d.csv"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
