export const dynamic = "force-dynamic";
import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createService } from "@/lib/supabase/service";
import { requireAdminAuth } from "@/lib/auth-guard";

function ok(data: unknown) {
  return NextResponse.json({ ok: true, data });
}
function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

// Memory log store fallback for inventory movement history
const inventoryLogs: Array<{
  id: string;
  productId: string;
  productName: string;
  change: number;
  reason: string;
  previousStock: number;
  newStock: number;
  notes?: string | null;
  timestamp: string;
}> = [];

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const admin = createService();
  if (admin) {
    const { data, error } = await admin
      .from("inventory_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error && data) {
      return ok({ logs: (data as any[]).map((row: any) => ({
        id: row.id,
        productId: row.product_id,
        productName: row.product_name ?? "Product",
        change: row.change,
        reason: row.reason,
        previousStock: row.previous_stock,
        newStock: row.new_stock,
        notes: row.notes,
        timestamp: row.created_at,
      })) });
    }
  }

  return ok({ logs: inventoryLogs });
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const admin = createService();
  if (!admin) return bad("Database not configured", 503);

  let body: any;
  try { body = await req.json(); } catch { return bad("Invalid JSON"); }

  const { productId, change, reason, notes } = body;
  if (!productId || typeof change !== "number" || !reason) {
    return bad("Missing required fields: productId, change, reason");
  }

  // Fetch current product
  const { data: prod, error: fetchErr } = await admin
    .from("products")
    .select("id, name, stock")
    .eq("id", productId)
    .single();

  if (fetchErr || !prod) return bad("Product not found", 404);

  const previousStock = (prod as any).stock ?? 0;
  const newStock = Math.max(0, previousStock + change);

  // Update product stock
  const { error: updateErr } = await admin
    .from("products")
    .update({ stock: newStock } as never)
    .eq("id", productId);

  if (updateErr) return bad(updateErr.message, 500);

  // Create audit log
  const logEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    productId,
    productName: (prod as any).name ?? "Product",
    change,
    reason,
    previousStock,
    newStock,
    notes: notes || null,
    timestamp: new Date().toISOString(),
  };

  if (admin) {
    const insertPayload = {
      id: randomUUID(),
      product_id: productId,
      product_name: (prod as any).name ?? "Product",
      change,
      reason,
      previous_stock: previousStock,
      new_stock: newStock,
      notes: notes || null,
      operator: "admin",
    };

    const insertResult = await admin.from("inventory_logs").insert(insertPayload as never);
    const insertedRow = (insertResult as any)?.data ?? null;
    if (!insertResult?.error && insertedRow) {
      const persistedLog = {
        id: insertedRow.id ?? logEntry.id,
        productId: insertedRow.product_id ?? productId,
        productName: insertedRow.product_name ?? (prod as any).name ?? "Product",
        change: insertedRow.change ?? change,
        reason: insertedRow.reason ?? reason,
        previousStock: insertedRow.previous_stock ?? previousStock,
        newStock: insertedRow.new_stock ?? newStock,
        notes: insertedRow.notes ?? null,
        timestamp: insertedRow.created_at ?? new Date().toISOString(),
      };
      inventoryLogs.unshift(persistedLog);
      return ok({ updated: true, newStock, log: persistedLog });
    }
  }

  inventoryLogs.unshift(logEntry);
  return ok({ updated: true, newStock, log: logEntry });
}
