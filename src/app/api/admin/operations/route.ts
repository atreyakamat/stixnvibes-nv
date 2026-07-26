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

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") || "batches";

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
