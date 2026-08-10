export const dynamic = "force-dynamic";
import { SizeService } from "@/lib/services/size-service";
import { createApiHandler } from "@/lib/api-handler";
import { SizeSchema } from "@/lib/validations/size";
import { z } from "zod";

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
    if (body.id) {
      return await sizeService.updateSize(body.id, body);
    } else {
      return await sizeService.createSize(body);
    }
  }
});

export const DELETE = createApiHandler({
  requireAdmin: true,
  querySchema: z.object({ id: z.string().uuid() }),
  handler: async ({ query }) => {
    await sizeService.deleteSize(query.id);
    return { deleted: true, id: query.id };
  }
});
