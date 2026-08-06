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
  if (!admin) return bad("Database service unconfigured or unavailable", 503);

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") || "batches";

  try {
    if (mode === "qc") {
      const { data, error } = await admin
        .from("quality_checks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("[/api/admin/operations GET qc]", error.message);
        if (isConnectionError(error.message)) {
          return bad(`Database connection failed: ${error.message}`, 503);
        }
        return bad(error.message, 500);
      }

      return ok({ qcInspections: (data as any[]).map((row: any) => ({
        id: row.id,
        orderId: row.order_id,
        operator: row.operator,
        result: row.result,
        checklist: row.checklist ?? {},
        timestamp: row.created_at,
      })) });
    } else {
      const { data, error } = await admin
        .from("print_batches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("[/api/admin/operations GET batches]", error.message);
        if (isConnectionError(error.message)) {
          return bad(`Database connection failed: ${error.message}`, 503);
        }
        return bad(error.message, 500);
      }

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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/admin/operations GET catch]", msg);
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

  let body: any;
  try { body = await req.json(); } catch { return bad("Invalid JSON"); }

  const { action } = body;

  try {
    if (action === "create_batch") {
      const { material, finish, size, orderCount, estTimeMins, operator } = body;
      if (!material || !finish || !size) return bad("Missing required batch parameters");

      const batchNumber = `BATCH-${Math.floor(1000 + Math.random() * 9000)}`;
      const payload = {
        id: randomUUID(),
        batch_number: batchNumber,
        material,
        finish,
        size,
        order_count: orderCount || 1,
        status: "queued",
        est_time_mins: estTimeMins || 30,
        operator: operator || "Operator",
      };

      const { data, error } = await admin.from("print_batches").insert(payload as never).select().single();
      if (error) {
        if (isConnectionError(error.message)) {
          return bad(`Database connection failed: ${error.message}`, 503);
        }
        return bad(error.message, 500);
      }

      return ok({ created: true, batch: data });
    }

    if (action === "update_batch_status") {
      const { batchId, status } = body;
      if (!batchId || !status) return bad("Missing batchId or status");

      const { data, error } = await admin
        .from("print_batches")
        .update({ status } as never)
        .eq("id", batchId)
        .select()
        .single();

      if (error) {
        if (isConnectionError(error.message)) {
          return bad(`Database connection failed: ${error.message}`, 503);
        }
        return bad(error.message, 500);
      }

      return ok({ updated: true, batch: data });
    }

    if (action === "submit_qc" || action === "qc_inspection") {
      const orderId = body.orderId || body.productionJobId || body.order_id || body.production_job_id;
      const operator = body.operator || "Operator";
      const result = body.result;
      const checklist = body.checklist || {};
      if (!result) return bad("Missing required QC result");

      const payload = {
        id: randomUUID(),
        order_id: orderId || null,
        production_job_id: body.productionJobId || body.production_job_id || null,
        operator,
        result,
        checklist,
      };

      const { data, error } = await admin.from("quality_checks").insert(payload as never).select().single();
      if (error) {
        if (isConnectionError(error.message)) {
          return bad(`Database connection failed: ${error.message}`, 503);
        }
        return bad(error.message, 500);
      }

      return ok({ recorded: true, qc: data });
    }

    return bad("Unknown action");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isConnectionError(msg)) {
      return bad(`Database connection error: ${msg}`, 503);
    }
    return bad(msg, 500);
  }
}
