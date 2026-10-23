import { z } from "zod";
import { MAX_LINES, MAX_QTY_PER_LINE } from "@/lib/constants";
import { normalizePhone } from "@/lib/phone";
import { EVENT_TYPES, FULFILMENTS } from "@/lib/types";

const trimmed = (max: number) => z.string().trim().max(max);

export const orderLineSchema = z.object({
  productId: trimmed(64).min(1),
  qty: z.number().int().min(1).max(MAX_QTY_PER_LINE),
  selections: z.record(z.string().max(64), z.string().max(64)).default({}),
  custom: z.record(z.string().max(64), z.string().trim().max(600)).default({}),
});
export type OrderLineInput = z.infer<typeof orderLineSchema>;

const addressSchema = z.object({
  line: trimmed(200).default(""),
  city: trimmed(60).default(""),
  state: trimmed(40).default(""),
  pincode: trimmed(6).default(""),
});

export const orderSchema = z
  .object({
    lines: z.array(orderLineSchema).min(1, "Your cart is empty.").max(MAX_LINES, "That's a lot of different items. Message us for bulk orders."),
    customerName: trimmed(80).min(2, "Add your name."),
    customerPhone: z
      .string()
      .max(20)
      .transform((v, ctx) => {
        const phone = normalizePhone(v);
        if (!phone) {
          ctx.addIssue({ code: "custom", message: "Add a 10-digit mobile number." });
          return z.NEVER;
        }
        return phone;
      }),
    fulfilment: z.enum(FULFILMENTS).default("delivery"),
    address: addressSchema.default({ line: "", city: "", state: "", pincode: "" }),
    customerNote: trimmed(500).default(""),
    // Honeypot: real people never see or fill this field.
    company: z.string().max(0).optional(),
  })
  .superRefine((o, ctx) => {
    if (o.fulfilment !== "delivery") return;
    if (o.address.line.length < 5) ctx.addIssue({ code: "custom", path: ["address", "line"], message: "Add your delivery address." });
    if (o.address.city.length < 2) ctx.addIssue({ code: "custom", path: ["address", "city"], message: "Add your city." });
    if (!/^[1-9]\d{5}$/.test(o.address.pincode)) ctx.addIssue({ code: "custom", path: ["address", "pincode"], message: "Add a 6-digit pincode." });
  })
  .transform((o) => (o.fulfilment === "pickup" ? { ...o, address: { line: "", city: "", state: "", pincode: "" } } : o));
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
