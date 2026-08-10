import { createApiHandler } from "@/lib/api-handler";
import { OrderService } from "@/lib/services/order-service";
import { z } from "zod";

const orderService = new OrderService();

export const GET = createApiHandler({
  querySchema: z.object({
    query: z.string().min(1, "Order ID or phone number is required"),
  }),
  handler: async ({ query }) => {
    return await orderService.trackOrder(query.query);
  },
});
