export const dynamic = "force-dynamic";
import { OrderService } from "@/lib/services/order-service";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { $Enums } from "@prisma/client";

const orderService = new OrderService();

export const GET = createApiHandler({
  requireAdmin: true,
  querySchema: z.object({
    status: z.string().optional(),
    search: z.string().optional(),
    limit: z.coerce.number().default(100),
  }),
  handler: async ({ query }) => {
    return await orderService.getOrders(query);
  }
});

const OrderPayloadSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["created", "sent", "confirmed", "paid", "fulfilled", "cancelled", "refunded"]).optional(),
  notes: z.string().optional(),
  tracking_number: z.string().optional(),
  courier: z.string().optional(),
});

export const POST = createApiHandler({
  requireAdmin: true,
  bodySchema: OrderPayloadSchema,
  handler: async ({ body }) => {
    if (body.status) {
      return await orderService.updateOrderStatus(body.orderId, body.status as $Enums.order_status);
    }

    if (body.notes !== undefined) {
      return await orderService.updateOrderNotes(body.orderId, body.notes);
    }

    if (body.tracking_number !== undefined || body.courier !== undefined) {
      return await orderService.updateTracking(body.orderId, body.tracking_number || "", body.courier || "");
    }

    throw new Error("No valid update operation specified");
  }
});
