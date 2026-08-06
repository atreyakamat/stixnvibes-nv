export const dynamic = "force-dynamic";
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

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const admin = createService();
  if (!admin) return bad("Database service unconfigured or unavailable", 503);

  try {
    const { data, error } = await admin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[/api/admin/orders GET]", error.message);
      if (isConnectionError(error.message)) {
        return bad(`Database connection failed: ${error.message}`, 503);
      }
      return bad(error.message, 500);
    }
    return ok(data ?? []);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/admin/orders GET catch]", msg);
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
  if (!admin) return bad("Database not configured", 503);

  let body: any;
  try { body = await req.json(); } catch { return bad("Invalid JSON"); }

  const { id, status, priority, assignedTo, notes, awbNumber, courier } = body;
  if (!id) return bad("Missing required order id");

  try {
    const updatePayload: Record<string, any> = {};
    if (status) {
      const { data: existing, error: fetchErr } = await admin.from("orders").select("status").eq("id", id).single();
      if (fetchErr || !existing) return bad("Order not found", 404);

      const { validateStateTransition } = await import("@/lib/orders/state-machine");
      try {
        validateStateTransition((existing as any).status, status as any);
        updatePayload.status = status;
      } catch (e: any) {
        return bad(e.message, 400);
      }
    }

    if (priority) updatePayload.priority = priority;
    if (assignedTo !== undefined) updatePayload.assigned_to = assignedTo;
    if (notes !== undefined) updatePayload.notes = notes;
    if (awbNumber) updatePayload.awb_number = awbNumber;
    if (courier) updatePayload.courier = courier;

    const { data, error } = await admin
      .from("orders")
      .update(updatePayload as never)
      .eq("id", id)
      .select()
      .single();

    if (error) return bad(error.message, 500);
    return ok(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/admin/orders POST]", msg);
    return bad("Database connection failed", 503);
  }
}
