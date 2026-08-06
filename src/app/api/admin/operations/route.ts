export const dynamic = "force-dynamic";
import { type NextRequest } from "next/server";
import { OperationsRepository } from "@/lib/repositories/operations-repository";
import { ApiResponse, handleApiError } from "@/lib/api-response";
import { requireAdminAuth } from "@/lib/auth-guard";

const operationsRepo = new OperationsRepository();

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") || "batches";

  try {
    if (mode === "qc") {
      const inspections = await operationsRepo.getQualityChecks();
      return ApiResponse.success({
        qcInspections: inspections.map((row) => ({
          id: row.id,
          orderId: row.order_id ?? row.production_job_id ?? "",
          operator: row.operator,
          result: row.result,
          checklist: (row.checklist as Record<string, boolean>) ?? {},
          timestamp: row.created_at,
        })),
      });
    } else {
      const batches = await operationsRepo.getPrintBatches();
      return ApiResponse.success({
        printBatches: batches.map((row) => ({
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
        })),
      });
    }
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return ApiResponse.error("Invalid JSON body", "BAD_REQUEST", 400);
  }

  const { action } = body;

  try {
    if (action === "create_batch") {
      const { material, finish, size, orderCount, estTimeMins, operator } = body;
      if (!material || !finish || !size) {
        return ApiResponse.error("Missing required batch parameters: material, finish, size", "BAD_REQUEST", 400);
      }

      const batch = await operationsRepo.createPrintBatch({
        material,
        finish,
        size,
        orderCount,
        estTimeMins,
        operator,
      });
      return ApiResponse.success({ created: true, batch });
    }

    if (action === "update_batch_status") {
      const { batchId, status } = body;
      if (!batchId || !status) {
        return ApiResponse.error("Missing batchId or status", "BAD_REQUEST", 400);
      }

      const batch = await operationsRepo.updateBatchStatus(batchId, status);
      return ApiResponse.success({ updated: true, batch });
    }

    if (action === "submit_qc" || action === "qc_inspection") {
      const orderId = body.orderId || body.productionJobId || body.order_id || body.production_job_id;
      const operator = body.operator || "Operator";
      const result = body.result;
      const checklist = body.checklist || {};
      if (!result) {
        return ApiResponse.error("Missing required QC result", "BAD_REQUEST", 400);
      }

      const qc = await operationsRepo.recordQualityCheck({
        orderId,
        productionJobId: body.productionJobId || body.production_job_id || null,
        operator,
        result,
        checklist,
      });
      return ApiResponse.success({ recorded: true, qc });
    }

    return ApiResponse.error("Unknown action", "BAD_REQUEST", 400);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
