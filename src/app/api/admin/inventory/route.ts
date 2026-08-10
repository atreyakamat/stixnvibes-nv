export const dynamic = "force-dynamic";
import { InventoryService } from "@/lib/services/inventory-service";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";

const inventoryService = new InventoryService();

export const GET = createApiHandler({
  requireAdmin: true,
  querySchema: z.object({
    productId: z.string().uuid().optional(),
    limit: z.coerce.number().default(100),
  }),
  handler: async ({ query }) => {
    const logs = await inventoryService.getLogs(query);
    return { logs };
  }
});

const InventoryChangeSchema = z.object({
  productId: z.string().uuid(),
  change: z.number(),
  reason: z.string().min(1),
  notes: z.string().optional(),
});

export const POST = createApiHandler({
  requireAdmin: true,
  bodySchema: InventoryChangeSchema,
  handler: async ({ body }) => {
    const result = await inventoryService.recordStockChange(body.productId, body.change, body.reason, body.notes);
    return { updated: true, newStock: result.newStock, log: result.log };
  }
});
