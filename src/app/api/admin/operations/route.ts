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
    const newBatch = {
      id: `batch_${Date.now()}`,
      batchNumber: `BATCH-${Math.floor(1000 + Math.random() * 9000)}`,
      material: material || "Vinyl",
      finish: finish || "Glossy Finish",
      size: size || '3" x 3"',
      orderCount: Math.floor(10 + Math.random() * 20),
      status: "queued" as const,
      estTimeMins: 30,
      operator: "Operator-01",
      created_at: new Date().toISOString(),
    };

    const admin = createService();
    if (admin) {
      const insertPayload = {
        id: randomUUID(),
        batch_number: newBatch.batchNumber,
        material: newBatch.material,
        finish: newBatch.finish,
        size: newBatch.size,
        order_count: newBatch.orderCount,
        status: newBatch.status,
        est_time_mins: newBatch.estTimeMins,
        operator: newBatch.operator,
      };

      const insertResult = await admin.from("print_batches").insert(insertPayload as never);
      const insertedRow = (insertResult as any)?.data ?? null;
      if (!insertResult?.error && insertedRow) {
        const persistedBatch = {
          id: insertedRow.id ?? newBatch.id,
          batchNumber: insertedRow.batch_number ?? newBatch.batchNumber,
          material: insertedRow.material ?? newBatch.material,
          finish: insertedRow.finish ?? newBatch.finish,
          size: insertedRow.size ?? newBatch.size,
          orderCount: insertedRow.order_count ?? newBatch.orderCount,
          status: insertedRow.status ?? newBatch.status,
          estTimeMins: insertedRow.est_time_mins ?? newBatch.estTimeMins,
          operator: insertedRow.operator ?? newBatch.operator,
          created_at: insertedRow.created_at ?? newBatch.created_at,
        };
        printBatches.unshift(persistedBatch);
        return ok({ created: true, batch: persistedBatch });
      }
    }

    printBatches.unshift(newBatch);
    return ok({ created: true, batch: newBatch });
  }

  // 2. Advance Batch Status
  if (action === "update_batch_status" && batchId) {
    const batch = printBatches.find((b) => b.id === batchId);
    if (batch) {
      batch.status = body.status || "printing";
      return ok({ updated: true, batch });
    }
  }

  // 3. Record QC Inspection
  if (action === "qc_inspection" && orderId && result) {
    const qcEntry = {
      id: `qc_${Date.now()}`,
      orderId,
      operator: "QC-Inspector-1",
      result,
      checklist: checklist || {},
      timestamp: new Date().toISOString(),
    };

    const admin = createService();
    if (admin) {
      const insertPayload = {
        id: randomUUID(),
        order_id: orderId,
        operator: qcEntry.operator,
        result,
        checklist: checklist || {},
      };

      const insertResult = await admin.from("quality_checks").insert(insertPayload as never);
      const insertedRow = (insertResult as any)?.data ?? null;
      if (!insertResult?.error && insertedRow) {
        const persistedEntry = {
          id: insertedRow.id ?? qcEntry.id,
          orderId: insertedRow.order_id ?? orderId,
          operator: insertedRow.operator ?? qcEntry.operator,
          result: insertedRow.result ?? result,
          checklist: insertedRow.checklist ?? (checklist || {}),
          timestamp: insertedRow.created_at ?? qcEntry.timestamp,
        };
        qcInspections.unshift(persistedEntry);
        return ok({ qc: true, entry: persistedEntry });
      }
    }

    qcInspections.unshift(qcEntry);
    return ok({ qc: true, entry: qcEntry });
  }

  // 4. Generate Shipping AWB Number
  if (action === "generate_awb" && orderId) {
    const provider = courier || "Delhivery";
    const awbNumber = `${provider.slice(0, 3).toUpperCase()}${Date.now().toString().slice(-8)}`;
    return ok({
      awb: true,
      awbNumber,
      courier: provider,
      trackingUrl: `https://track.stixnvibes.com/?awb=${awbNumber}`,
    });
  }

  return bad("Unknown operations action");
}
