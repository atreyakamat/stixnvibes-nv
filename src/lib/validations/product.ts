import { z } from "zod";

export const ProductSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  slug: z.string().min(2, "Slug must be at least 2 characters").regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  description: z.string().optional().nullable(),
  short_description: z.string().optional().nullable(),
  price_cents: z.number().positive("Price must be greater than 0"),
  compare_at_cents: z.number().positive("Compare at price must be positive").optional().nullable(),
  currency: z.string().default("INR"),
  stock: z.number().min(0, "Stock cannot be negative"),
  is_featured: z.boolean().default(false),
  customizable: z.boolean().default(false),
  type: z.enum(["sticker", "sticker_vinyl", "poster", "spotify_card", "frame", "mystery_pack"]),
  status: z.enum(["active", "draft", "archived"]),
  visibility: z.enum(["visible", "hidden"]).default("visible"),
  category_id: z.string().uuid().optional().nullable(),
  collection_id: z.string().uuid().optional().nullable(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  image_url: z.string().url("Must be a valid URL").optional().nullable(),
  images: z.array(z.string().url("Must be a valid URL")).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
}).refine(data => !data.compare_at_cents || data.compare_at_cents > data.price_cents, {
  message: "Compare at price must be greater than selling price",
  path: ["compare_at_cents"],
});

export function validateProduct(data: unknown) {
  return ProductSchema.safeParse(data);
}
