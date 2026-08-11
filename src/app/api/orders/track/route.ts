import { createApiHandler } from "@/lib/api-handler";
import { OrderService } from "@/lib/services/order-service";
import { z } from "zod";

const orderService = new OrderService();

export const GET = createApiHandler({
  querySchema: z.object({
    query: z.string().min(1, "Order ID or phone number is required"),
  }),
  handler: async ({ query }) => {
    try {
      const result = await orderService.trackOrder(query.query);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e: any) {
      if (e.code === "NOT_FOUND" || e.name === "NotFoundError") {
        return new Response(JSON.stringify({ found: false, error: e.message }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw e;
    }
  },
});
