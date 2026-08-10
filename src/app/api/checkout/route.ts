import { createApiHandler } from "@/lib/api-handler";
import { CheckoutService } from "@/lib/services/checkout-service";
import { z } from "zod";

const checkoutService = new CheckoutService();

const checkoutItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  variantId: z.string().optional().nullable(),
  name: z.string(),
  price_cents: z.number().int(),
  quantity: z.number().int().min(1),
  image: z.string().optional(),
  variantName: z.string().optional(),
});

const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, "Cart is empty"),
  shippingAddress: z.object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().min(1, "Phone is required"),
    email: z.string().optional(),
    address: z.string().min(1, "Address is required"),
    pincode: z.string().min(1, "Pincode is required"),
    notes: z.string().optional(),
  }),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(["razorpay", "whatsapp"]).optional(),
});

export const POST = createApiHandler({
  bodySchema: checkoutSchema,
  handler: async ({ body }) => {
    const result = await checkoutService.processCheckout(body);
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});
