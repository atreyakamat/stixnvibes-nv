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

function isConnectionError(message: string): boolean {
  const msg = message.toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("econnrefused") ||
    msg.includes("networkerror") ||
    msg.includes("failed to fetch") ||
    msg.includes("connect econnrefused")
  );
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
  if (!admin) return bad("Database service unconfigured or unavailable", 503);

  try {
    const { data, error } = await admin
      .from("inventory_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[/api/admin/inventory GET]", error.message);
      if (isConnectionError(error.message)) {
        return bad(`Database connection failed: ${error.message}`, 503);
      }
      return bad(error.message, 500);
    }

    const logs = (data ?? []).map((row) => ({
      id: row.id,
      productId: row.product_id ?? "",
      productName: row.product_name ?? "Product",
      change: row.change,
      reason: row.reason,
      previousStock: row.previous_stock,
      newStock: row.new_stock,
      notes: row.notes,
      timestamp: row.created_at,
    }));

    return ok({ logs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/admin/inventory GET catch]", msg);
    if (isConnectionError(msg)) {
      return bad(`Database connection error: ${msg}`, 503);
    }
    return bad(msg, 500);
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const admin = createService();
  if (!admin) return bad("Database service unconfigured or unavailable", 503);

  let body: { productId?: string; change?: number; reason?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON");
  }

  const { productId, change, reason, notes } = body;
  if (!productId || typeof change !== "number" || !reason) {
    return bad("Missing required fields: productId, change, reason");
  }

  try {
    // Fetch current product
    const { data: prod, error: fetchErr } = await admin
      .from("products")
      .select("id, name, stock")
      .eq("id", productId)
      .single();

    if (fetchErr) {
      if (isConnectionError(fetchErr.message)) {
        return bad(`Database connection failed: ${fetchErr.message}`, 503);
      }
      if (fetchErr.code === "PGRST116" || !prod) {
        return bad("Product not found", 404);
      }
      return bad(fetchErr.message, 500);
    }

    const previousStock = prod.stock ?? 0;
    const newStock = Math.max(0, previousStock + change);

    // Update product stock
    const { error: updateErr } = await admin
      .from("products")
      .update({ stock: newStock })
      .eq("id", productId);

    if (updateErr) {
      if (isConnectionError(updateErr.message)) {
        return bad(`Database connection failed: ${updateErr.message}`, 503);
      }
      return bad(updateErr.message, 500);
    }

    const insertPayload = {
      id: randomUUID(),
      product_id: productId,
      product_name: prod.name ?? "Product",
      change,
      reason,
      previous_stock: previousStock,
      new_stock: newStock,
      notes: notes || null,
      operator: "admin",
    };

    const insertResult = await admin.from("inventory_logs").insert(insertPayload).select().single();
    if (insertResult.error) {
      if (isConnectionError(insertResult.error.message)) {
        return bad(`Database connection failed: ${insertResult.error.message}`, 503);
      }
      return bad(insertResult.error.message, 500);
    }

    const insertedRow = insertResult.data;
    const persistedLog = {
      id: insertedRow.id,
      productId: insertedRow.product_id ?? productId,
      productName: insertedRow.product_name ?? prod.name ?? "Product",
      change: insertedRow.change,
      reason: insertedRow.reason,
      previousStock: insertedRow.previous_stock,
      newStock: insertedRow.new_stock,
      notes: insertedRow.notes,
      timestamp: insertedRow.created_at,
    };
    inventoryLogs.unshift(persistedLog);
    return ok({ updated: true, newStock, log: persistedLog });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isConnectionError(msg)) {
      return bad(`Database connection error: ${msg}`, 503);
    }
    return bad(msg, 500);
  }
}
