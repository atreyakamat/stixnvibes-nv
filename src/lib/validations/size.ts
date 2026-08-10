import { z } from "zod";

export const SizeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  width_mm: z.number().min(0, "Width cannot be negative").optional(),
  height_mm: z.number().min(0, "Height cannot be negative").optional(),
  category: z.string().optional().nullable(),
  is_active: z.boolean().optional().default(true),
  sort_order: z.number().int().optional().default(0),
});

export function validateSize(data: unknown) {
  return SizeSchema.safeParse(data);
}
