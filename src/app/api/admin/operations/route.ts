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
  action: z.enum([
    "create_batch",
    "update_batch_status",
    "submit_qc",
    "qc_inspection",
    "create_shipment",
    "confirm_delivery",
  ]),
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
  result: z.enum(["pass", "fail", "passed", "failed"]).optional(),
  checklist: z.record(z.string(), z.boolean()).optional(),
  courier: z.string().optional(),
  awb: z.string().optional(),
  failureReason: z.string().optional(),
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
      const operator = body.operator || "Inspector";
      const rawResult = body.result;
      const checklist = body.checklist || {};
      if (!rawResult) {
        throw new Error("Missing required QC result");
      }

      const normalizedResult: "passed" | "failed" =
        rawResult === "pass" || rawResult === "passed" ? "passed" : "failed";

      const { QcService } = await import("@/lib/services/qc.service");
      const qcService = new QcService();
      
      const jobId = body.productionJobId || body.production_job_id || orderId || "";
      const qc = await qcService.recordQcResult(
        jobId,
        operator,
        normalizedResult,
        body.failureReason
      );
      return { recorded: true, qc };
    }

    if (action === "create_shipment") {
      const orderId = body.orderId || body.order_id;
      const courier = body.courier;
      const awb = body.awb;
      if (!orderId || !courier || !awb) {
        throw new Error("Missing required shipment fields: orderId, courier, awb");
      }

      const { ShippingService } = await import("@/lib/services/shipping.service");
      const shippingService = new ShippingService();
      const shipment = await shippingService.createShipment(orderId, courier, awb);
      return { created: true, shipment };
    }

    if (action === "confirm_delivery") {
      const orderId = body.orderId || body.order_id;
      if (!orderId) {
        throw new Error("Missing orderId for delivery confirmation");
      }

      const { ShippingService } = await import("@/lib/services/shipping.service");
      const shippingService = new ShippingService();
      const order = await shippingService.confirmDelivery(orderId);
      return { confirmed: true, order };
    }

    throw new Error("Unknown action");
  }
});
