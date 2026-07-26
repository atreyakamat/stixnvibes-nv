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

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const admin = createService();
  if (!admin) return bad("Database not configured", 503);

  const { data, error } = await admin
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return bad(error.message, 500);
  return ok(data);
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

  const updatePayload: Record<string, any> = {};
  if (status) updatePayload.status = status;
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
}
