import { z } from "zod";
import { CUSTOM_CUTS, MAX_QTY_PER_LINE } from "@/lib/constants";

export { CUSTOM_CUTS, MAX_UPLOAD_BYTES, UPLOAD_TYPES } from "@/lib/constants";

const trimmed = (max: number) => z.string().trim().max(max);

export const cartLinesSchema = z
  .array(
    z.object({
      productId: trimmed(64).min(1),
      variantId: trimmed(64).min(1),
      qty: z.number().int().min(1).max(MAX_QTY_PER_LINE),
    }),
  )
  .min(1, "Your cart is empty.")
  .max(40, "That's a lot of different items. Message us for bulk orders.");

/** Indian mobile: 10 digits starting 6-9, with optional +91 / 0 prefix. */
export function normalisePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.length === 11 && digits.startsWith("0") ? digits.slice(1) : digits;
  return /^[6-9]\d{9}$/.test(local) ? local : null;
}

const phone = z
  .string()
  .transform((v, ctx) => {
    const p = normalisePhone(v);
    if (!p) {
      ctx.addIssue({ code: "custom", message: "Enter a 10 digit Indian mobile number." });
      return z.NEVER;
    }
    return p;
  });

const addressSchema = z.object({
  line1: trimmed(200).min(3, "Enter your address."),
  line2: trimmed(200).optional().default(""),
  city: trimmed(80).min(2, "Enter your city."),
  state: trimmed(80).min(2, "Enter your state."),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a 6 digit pincode."),
});

export const checkoutSchema = z
  .object({
    lines: cartLinesSchema,
    fulfilment: z.enum(["ship", "pickup"]),
    paymentMethod: z.enum(["upi", "pickup"]),
    customer: z.object({
      name: trimmed(80).min(2, "Enter your name."),
      phone,
      email: z.union([z.literal(""), z.email("Enter a valid email.").max(120)]).optional().default(""),
      instagram: trimmed(40).optional().default(""),
    }),
    address: addressSchema.nullable().optional(),
    notes: trimmed(500).optional().default(""),
    // Honeypot: real people never see or fill this field.
    company: z.string().max(0).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.fulfilment === "ship" && !v.address) {
      ctx.addIssue({ code: "custom", path: ["address"], message: "Enter a delivery address." });
    }
    if (v.paymentMethod === "pickup" && v.fulfilment !== "pickup") {
      ctx.addIssue({ code: "custom", path: ["paymentMethod"], message: "Pay at pickup is only for pickup orders." });
    }
  });
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const utrSchema = z.object({
  token: z.string().min(16).max(64),
  utr: z.string().min(1, "Enter the UPI reference number."),
});

export const trackSchema = z.object({
  number: z.string().trim().toUpperCase().regex(/^SNV-[A-Z0-9]{6}$/, "Order numbers look like SNV-AB12CD."),
  phone,
});

export const customRequestSchema = z.object({
  name: trimmed(80).min(2, "Enter your name."),
  contact: trimmed(120).min(3, "Add a phone number, email or Instagram handle."),
  description: trimmed(2000).min(10, "Tell us a little more about what you want."),
  cut: z.enum(CUSTOM_CUTS),
  size: trimmed(60).optional().default(""),
  quantity: z.coerce.number().int().min(1, "At least 1.").max(10000),
  company: z.string().max(0).optional(),
});
