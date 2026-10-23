import { z } from "zod";
import { MAX_LINES, MAX_QTY_PER_LINE } from "@/lib/constants";
import { EVENT_TYPES } from "@/lib/types";

const trimmed = (max: number) => z.string().trim().max(max);

export const orderLineSchema = z.object({
  productId: trimmed(64).min(1),
  qty: z.number().int().min(1).max(MAX_QTY_PER_LINE),
  selections: z.record(z.string().max(64), z.string().max(64)).default({}),
  custom: z.record(z.string().max(64), z.string().trim().max(600)).default({}),
});
export type OrderLineInput = z.infer<typeof orderLineSchema>;

export const orderSchema = z.object({
  lines: z.array(orderLineSchema).min(1, "Your cart is empty.").max(MAX_LINES, "That's a lot of different items. Message us for bulk orders."),
  customerName: trimmed(80).default(""),
  customerNote: trimmed(500).default(""),
  // Honeypot: real people never see or fill this field.
  company: z.string().max(0).optional(),
});
export type OrderInput = z.infer<typeof orderSchema>;

export const eventsSchema = z
  .array(
    z.object({
      type: z.enum(EVENT_TYPES),
      productId: trimmed(64).nullable().default(null),
      path: trimmed(200).default(""),
    }),
  )
  .min(1)
  .max(20);
