import { z } from "zod";
import { MAX_CUSTOM_FILES, MAX_LINES, MAX_QTY_PER_LINE, UPLOAD_ID_RE } from "@/lib/constants";
import { cleanHandle, INSTAGRAM_HANDLE_RE } from "@/lib/instagram";
import { normalizePhone } from "@/lib/phone";
import { CUSTOM_KINDS, EVENT_TYPES, FULFILMENTS, REVIEW_PHOTOS_MAX, REVIEW_TEXT_MAX } from "@/lib/types";

const trimmed = (max: number) => z.string().trim().max(max);

export const orderLineSchema = z.object({
  productId: trimmed(64).min(1),
  qty: z.number().int().min(1).max(MAX_QTY_PER_LINE),
  selections: z.record(z.string().max(64), z.string().max(64)).default({}),
  custom: z.record(z.string().max(64), z.string().trim().max(600)).default({}),
});
export type OrderLineInput = z.infer<typeof orderLineSchema>;

/** Where a visitor came from: a short slug like "stall-wordsup". Anything else becomes "". */
export const sourceSchema = z
  .string()
  .max(200)
  .default("")
  .transform((v) => cleanSource(v));

export function cleanSource(v: string): string {
  const s = v.trim().toLowerCase().replace(/[^a-z0-9-_.]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return s;
}

const phoneSchema = z
  .string()
  .max(20)
  .transform((v, ctx) => {
    const phone = normalizePhone(v);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "Add a 10-digit mobile number." });
      return z.NEVER;
    }
    return phone;
  });

// Optional Instagram username, stored without the @.
const instagramSchema = z
  .string()
  .max(120)
  .default("")
  .transform((v, ctx) => {
    const h = cleanHandle(v);
    if (h && !INSTAGRAM_HANDLE_RE.test(h)) {
      ctx.addIssue({ code: "custom", message: "That doesn't look like an Instagram username." });
      return z.NEVER;
    }
    return h;
  });

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
    customerPhone: phoneSchema,
    fulfilment: z.enum(FULFILMENTS).default("delivery"),
    address: addressSchema.default({ line: "", city: "", state: "", pincode: "" }),
    customerNote: trimmed(500).default(""),
    couponCode: trimmed(30).default(""),
    instagram: instagramSchema,
    source: sourceSchema,
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
      source: sourceSchema,
    }),
  )
  .min(1)
  .max(20);

export const customRequestSchema = z.object({
  customerName: trimmed(80).min(2, "Add your name."),
  customerPhone: phoneSchema,
  instagram: instagramSchema,
  kind: z.enum(CUSTOM_KINDS, { message: "Pick what you'd like made." }),
  size: trimmed(80).default(""),
  qty: z.coerce.number().int("Quantity is a whole number.").min(1, "Quantity is at least 1.").max(10000, "For more than 10,000, message us."),
  note: trimmed(1500).default(""),
  files: z.array(z.string().regex(UPLOAD_ID_RE)).min(1, "Add at least one design.").max(MAX_CUSTOM_FILES, `Up to ${MAX_CUSTOM_FILES} designs per request.`),
  source: sourceSchema,
  company: z.string().max(0).optional(),
});
export type CustomRequestInput = z.infer<typeof customRequestSchema>;

/** A customer review from the website or the app. Saved as pending. */
export const reviewSchema = z.object({
  productId: z.string().min(1).max(80),
  rating: z.coerce.number().int().min(1, "Tap the stars to rate it.").max(5),
  text: trimmed(REVIEW_TEXT_MAX).default(""),
  name: trimmed(60).min(2, "Add your name."),
  instagram: instagramSchema,
  photos: z.array(z.string().regex(UPLOAD_ID_RE, "Upload the photos again.")).max(REVIEW_PHOTOS_MAX, `Up to ${REVIEW_PHOTOS_MAX} photos.`).default([]),
  /** With the order page key, marks the review as from a verified buyer. */
  orderNumber: z.string().max(20).optional(),
  key: z.string().max(100).optional(),
  company: z.string().max(0).optional(),
});
export type ReviewInput = z.infer<typeof reviewSchema>;
