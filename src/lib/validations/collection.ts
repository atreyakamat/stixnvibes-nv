import { z } from "zod";

export const CollectionSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  slug: z.string().min(2, "Slug must be at least 2 characters").regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  description: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export function validateCollection(data: unknown) {
  return CollectionSchema.safeParse(data);
}
