export const dynamic = "force-dynamic";
import { MaterialService } from "@/lib/services/material-service";
import { createApiHandler } from "@/lib/api-handler";
import { MaterialSchema } from "@/lib/validations/material";
import { z } from "zod";

import { revalidatePath } from "next/cache";

const materialService = new MaterialService();

export const GET = createApiHandler({
  requireAdmin: true,
  handler: async () => {
    return await materialService.getMaterials();
  }
});

const MaterialPayloadSchema = MaterialSchema.extend({
  id: z.string().uuid().optional(),
});

export const POST = createApiHandler({
  requireAdmin: true,
  bodySchema: MaterialPayloadSchema,
  handler: async ({ body }) => {
    let result;
    if (body.id) {
      result = await materialService.updateMaterial(body.id, body);
    } else {
      result = await materialService.createMaterial(body);
    }
    revalidatePath('/', 'layout');
    return result;
  }
});

export const DELETE = createApiHandler({
  requireAdmin: true,
  querySchema: z.object({ id: z.string().uuid() }),
  handler: async ({ query }) => {
    await materialService.deleteMaterial(query.id);
    revalidatePath('/', 'layout');
    return { deleted: true, id: query.id };
  }
});
