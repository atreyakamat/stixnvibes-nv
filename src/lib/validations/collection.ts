import { z } from "zod";

export const CollectionSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().min(1, "Name must be at least 1 character").max(100, "Name too long"),
  slug: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  is_active: z.boolean().optional().default(true),
  sort_order: z.number().int().optional().default(0),
  metadata: z.any().optional(),
}).passthrough();

export function validateCollection(data: unknown) {
  return CollectionSchema.safeParse(data);
}
