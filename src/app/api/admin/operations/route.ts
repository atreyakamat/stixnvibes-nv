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

// In-Memory Print Batch Fallback Store
const printBatches: Array<{
  id: string;
  batchNumber: string;
  material: string;
  finish: string;
  size: string;
  orderCount: number;
  status: "queued" | "printing" | "completed" | "paused";
  estTimeMins: number;
  operator: string;
  created_at: string;
}> = [
  {
    id: "batch_1",
    batchNumber: "BATCH-1042",
    material: "Vinyl",
    finish: "Glossy Finish",
    size: '3" x 3"',
    orderCount: 18,
    status: "printing",
    estTimeMins: 25,
    operator: "Operator-01",
    created_at: new Date().toISOString(),
  },
  {
    id: "batch_2",
    batchNumber: "BATCH-1043",
    material: "Holographic Film",
    finish: "Metallic Sheen",
    size: '4" x 4"',
    orderCount: 12,
    status: "queued",
    estTimeMins: 35,
    operator: "Operator-02",
    created_at: new Date().toISOString(),
  },
];

// In-Memory QC Inspections Store
const qcInspections: Array<{
  id: string;
  orderId: string;
  operator: string;
  result: "pass" | "reprint" | "reject";
  checklist: Record<string, boolean>;
  timestamp: string;
}> = [];

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const admin = createService();
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") || "batches";

  if (admin) {
    if (mode === "qc") {
      const { data, error } = await admin
        .from("quality_checks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error && data) {
        return ok({ qcInspections: (data as any[]).map((row: any) => ({
          id: row.id,
          orderId: row.order_id,
          operator: row.operator,
          result: row.result,
          checklist: row.checklist ?? {},
          timestamp: row.created_at,
        })) });
      }
    } else {
      const { data, error } = await admin
        .from("print_batches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error && data) {
        return ok({ printBatches: (data as any[]).map((row: any) => ({
          id: row.id,
          batchNumber: row.batch_number,
          material: row.material,
          finish: row.finish,
          size: row.size,
          orderCount: row.order_count,
          status: row.status,
          estTimeMins: row.est_time_mins,
          operator: row.operator,
          created_at: row.created_at,
        })) });
      }
    }
  }

  if (mode === "qc") {
    return ok({ qcInspections });
  }

  return ok({ printBatches });
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  let body: any;
  try { body = await req.json(); } catch { return bad("Invalid JSON"); }

  const { action, batchId, orderId, result, checklist, courier, finish, material, size } = body;

  // 1. Generate New Print Batch
  if (action === "create_batch") {
    const admin = createService();
    if (!admin) return bad("DB not connected", 503);

    const newBatch = {
      id: randomUUID(),
      batch_number: `BATCH-${Math.floor(1000 + Math.random() * 9000)}`,
      material: material || "Vinyl",
      finish: finish || "Glossy Finish",
      size: size || '3" x 3"',
      order_count: 0,
      status: "queued",
      est_time_mins: 30,
      operator: "Operator-01",
    };

    const { data, error } = await admin.from("print_batches").insert(newBatch as any).select().single();
    if (error) return bad(error.message, 500);
    return ok({ created: true, batch: data });
  }

  // 2. Advance Batch Status
  if (action === "update_batch_status" && batchId) {
    const admin = createService();
    if (!admin) return bad("DB not connected", 503);

    const { data, error } = await admin
      .from("print_batches")
      .update({ status: body.status || "printing", updated_at: new Date().toISOString() } as never)
      .eq("id", batchId)
      .select()
      .single();

    if (error) return bad(error.message, 500);
    return ok({ updated: true, batch: data });
  }

  // 3. Record QC Inspection
  if (action === "qc_inspection" && body.productionJobId && result) {
    const admin = createService();
    if (!admin) return bad("DB not connected", 503);

    const qcEntry = {
      id: randomUUID(),
      production_job_id: body.productionJobId,
      operator: "QC-Inspector-1",
      result: result,
      failure_reason: body.failureReason ?? null,
      checklist: checklist || {},
    };

    const { data, error } = await admin.from("quality_checks").insert(qcEntry as never).select().single();
    if (error) return bad(error.message, 500);
    
    // Also update production job status
    await admin.from("production_jobs").update({ 
      status: result === 'pass' ? 'completed' : 'failed',
      updated_at: new Date().toISOString()
    } as never).eq("id", body.productionJobId);

    return ok({ qc: true, entry: data });
  }

  // 4. Pack Order & Generate Shipment
  if (action === "pack_order" && orderId) {
    const admin = createService();
    if (!admin) return bad("DB not connected", 503);

    // Verify order state
    const { data: orderData, error: orderErr } = await admin.from("orders").select("status").eq("id", orderId).single();
    if (orderErr || !orderData) return bad("Order not found", 404);
    
    const orderStatus = (orderData as any).status;
    if (orderStatus !== 'packing') {
       // Is it paid/verified? Let's assume we require 'packing' state.
       if (orderStatus === 'cancelled' || orderStatus === 'created') {
         return bad(`Cannot pack order in state ${orderStatus}`, 400);
       }
    }

    // Verify all production jobs passed QC
    const { data: items } = await admin.from("order_items").select("id").eq("order_id", orderId);
    if (!items || (items as any[]).length === 0) return bad("Order has no items", 400);
    
    const itemIds = (items as any[]).map(i => i.id);
    const { data: jobs } = await admin.from("production_jobs").select("id, status").in("order_item_id", itemIds);
    
    if (!jobs || (jobs as any[]).length === 0) return bad("No production jobs found for order", 400);
    const incomplete = (jobs as any[]).filter(j => j.status !== 'completed');
    if (incomplete.length > 0) return bad("Not all items have passed QC", 400);

    const provider = courier || "TEST_COURIER";
    const awbNumber = provider === "TEST_COURIER" ? "TEST-AWB-RCOD-001" : `${provider.slice(0, 3).toUpperCase()}${Date.now().toString().slice(-8)}`;

    const shipment = {
      id: randomUUID(),
      order_id: orderId,
      courier: provider,
      awb: awbNumber,
      status: "manifested",
    };

    const { data: shipData, error: shipErr } = await admin.from("shipments").insert(shipment as never).select().single();
    if (shipErr) {
       // if duplicate
       return bad("Shipment creation failed: " + shipErr.message, 500);
    }

    const { validateStateTransition } = await import("@/lib/orders/state-machine");
    try {
      validateStateTransition(orderStatus as any, "ready_for_dispatch");
      await admin.from("orders").update({ status: "ready_for_dispatch" } as never).eq("id", orderId);
    } catch (e) {
      // ignore transition failure if already dispatched
    }

    return ok({
      packed: true,
      shipment: shipData,
      trackingUrl: `https://track.stixnvibes.com/?awb=${awbNumber}`,
    });
  }

  return bad("Unknown operations action");
}
