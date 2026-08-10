export const dynamic = "force-dynamic";
import { OperationsRepository } from "@/lib/repositories/operations-repository";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";

const operationsRepo = new OperationsRepository();

export const GET = createApiHandler({
  requireAdmin: true,
  querySchema: z.object({
    mode: z.string().default("batches"),
  }),
  handler: async ({ query }) => {
    if (query.mode === "qc") {
      const inspections = await operationsRepo.getQualityChecks();
      return {
        qcInspections: inspections.map((row) => ({
          id: row.id,
          orderId: row.productionJobId ?? "", 
          operator: row.operator,
          result: row.result,
          checklist: (row.checklist as Record<string, boolean>) ?? {},
          timestamp: row.createdAt,
        })),
      };
    } else {
      const batches = await operationsRepo.getPrintBatches();
      return {
        printBatches: batches.map((row) => ({
          id: row.id,
          batchNumber: row.batchNumber,
          material: row.material,
          finish: row.finish,
          size: row.size,
          orderCount: row.orderCount,
          status: row.status,
          estTimeMins: row.estTimeMins,
          operator: row.operator,
          created_at: row.createdAt,
        })),
      };
    }
  }
});

const OperationsActionSchema = z.object({
  action: z.enum(["create_batch", "update_batch_status", "submit_qc", "qc_inspection"]),
  material: z.string().optional(),
  finish: z.string().optional(),
  size: z.string().optional(),
  orderCount: z.coerce.number().optional(),
  estTimeMins: z.coerce.number().optional(),
  operator: z.string().optional(),
  batchId: z.string().uuid().optional(),
  status: z.string().optional(),
  orderId: z.string().optional(),
  productionJobId: z.string().optional(),
  order_id: z.string().optional(),
  production_job_id: z.string().optional(),
  result: z.enum(["pass", "fail"]).optional(),
  checklist: z.record(z.string(), z.boolean()).optional(),
});

export const POST = createApiHandler({
  requireAdmin: true,
  bodySchema: OperationsActionSchema,
  handler: async ({ body }) => {
    const { action } = body;

    if (action === "create_batch") {
      const { material, finish, size, orderCount, estTimeMins, operator } = body;
      if (!material || !finish || !size) {
        throw new Error("Missing required batch parameters: material, finish, size");
      }

      const batch = await operationsRepo.createPrintBatch({
        material,
        finish,
        size,
        orderCount,
        estTimeMins,
        operator,
      });
      return { created: true, batch };
    }

    if (action === "update_batch_status") {
      const { batchId, status } = body;
      if (!batchId || !status) {
        throw new Error("Missing batchId or status");
      }

      const batch = await operationsRepo.updateBatchStatus(batchId, status);
      return { updated: true, batch };
    }

    if (action === "submit_qc" || action === "qc_inspection") {
      const orderId = body.orderId || body.productionJobId || body.order_id || body.production_job_id;
      const operator = body.operator || "Operator";
      const result = body.result;
      const checklist = body.checklist || {};
      if (!result) {
        throw new Error("Missing required QC result");
      }

      const qc = await operationsRepo.recordQualityCheck({
        productionJobId: body.productionJobId || body.production_job_id || orderId || "",
        operator,
        result,
        checklist,
      });
      return { recorded: true, qc };
    }

    throw new Error("Unknown action");
  }
});
