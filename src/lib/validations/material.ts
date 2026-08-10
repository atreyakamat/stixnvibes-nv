import { z } from "zod";

export const MaterialSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  slug: z.string().min(2, "Slug must be at least 2 characters").regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  description: z.string().optional().nullable(),
  cost_per_unit_cents: z.number().min(0, "Cost cannot be negative").optional().default(0),
  is_active: z.boolean().optional().default(true),
  sort_order: z.number().int().optional().default(0),
});

export function validateMaterial(data: unknown) {
  return MaterialSchema.safeParse(data);
}
