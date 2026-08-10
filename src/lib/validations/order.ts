import { z } from "zod";

export const OrderStatusSchema = z.enum(["created", "sent", "confirmed", "paid", "fulfilled", "cancelled", "refunded"]);

export const OrderSchema = z.object({
  customerName: z.string().min(2, "Customer name is required"),
  customerPhone: z.string().min(10, "Valid phone number is required"),
  customerEmail: z.string().email("Invalid email").optional().nullable(),
  address: z.string().min(10, "Complete address is required"),
  pincode: z.string().min(6, "Valid pincode is required"),
  totalCents: z.number().min(0, "Total must be at least 0"),
  status: OrderStatusSchema.optional().default("created"),
  notes: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

export function validateOrder(data: unknown) {
  return OrderSchema.safeParse(data);
}
