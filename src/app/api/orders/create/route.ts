import { createApiHandler } from "@/lib/api-handler";
import { OrderService } from "@/lib/services/order-service";
import { z } from "zod";

const orderService = new OrderService();

const cartLineSchema = z.object({
  product_id: z.string().optional(),
  variant_id: z.string().optional().nullable(),
  name: z.string().min(1),
  quantity: z.number().int().min(1).max(100).optional(),
  price_cents: z.number().min(0),
  image_url: z.string().optional(),
  variant_name: z.string().optional(),
});

const createOrderSchema = z.object({
  customer_name: z.string().min(2),
  customer_phone: z.string().regex(/^\+?[0-9]{8,15}$/),
  customer_email: z.string().email().optional().nullable(),
  address: z.string().min(6),
  pincode: z.string().regex(/^[0-9A-Za-z\s-]{3,10}$/),
  notes: z.string().optional(),
  items: z.array(cartLineSchema).min(1),
});

export const POST = createApiHandler({
  bodySchema: createOrderSchema,
  handler: async ({ body }) => {
    return await orderService.publicCreateOrder(body);
  },
});
