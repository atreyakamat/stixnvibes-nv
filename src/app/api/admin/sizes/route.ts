export const dynamic = "force-dynamic";
import { SizeService } from "@/lib/services/size-service";
import { createApiHandler } from "@/lib/api-handler";
import { SizeSchema } from "@/lib/validations/size";
import { z } from "zod";

import { revalidatePath } from "next/cache";

const sizeService = new SizeService();

export const GET = createApiHandler({
  requireAdmin: true,
  querySchema: z.object({ category: z.string().optional() }),
  handler: async ({ query }) => {
    return await sizeService.getSizes(query.category);
  }
});

const SizePayloadSchema = SizeSchema.extend({
  id: z.string().uuid().optional(),
});

export const POST = createApiHandler({
  requireAdmin: true,
  bodySchema: SizePayloadSchema,
  handler: async ({ body }) => {
    const safeRevalidate = () => {
      try {
        revalidatePath('/', 'layout');
      } catch {}
    };

    let result;
    if (body.id) {
      const existing = await sizeService.getSizeById(body.id);
      if (existing) {
        result = await sizeService.updateSize(body.id, body);
      } else {
        result = await sizeService.createSize(body);
      }
    } else {
      result = await sizeService.createSize(body);
    }
    safeRevalidate();
    return result;
  }
});

export const DELETE = createApiHandler({
  requireAdmin: true,
  querySchema: z.object({ id: z.string().uuid() }),
  handler: async ({ query }) => {
    await sizeService.deleteSize(query.id);
    try {
      revalidatePath('/', 'layout');
    } catch {}
    return { deleted: true, id: query.id };
  }
});
