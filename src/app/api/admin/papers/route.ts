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

const PaperPayloadSchema = MaterialSchema.extend({
  id: z.string().uuid().optional(),
});

export const POST = createApiHandler({
  requireAdmin: true,
  bodySchema: PaperPayloadSchema,
  handler: async ({ body }) => {
    const safeRevalidate = () => {
      try {
        revalidatePath('/', 'layout');
      } catch {}
    };

    let result;
    if (body.id) {
      const existing = await materialService.getMaterialById(body.id);
      if (existing) {
        result = await materialService.updateMaterial(body.id, body);
      } else {
        result = await materialService.createMaterial(body);
      }
    } else {
      result = await materialService.createMaterial(body);
    }
    safeRevalidate();
    return result;
  }
});

export const DELETE = createApiHandler({
  requireAdmin: true,
  querySchema: z.object({ id: z.string().uuid() }),
  handler: async ({ query }) => {
    await materialService.deleteMaterial(query.id);
    try {
      revalidatePath('/', 'layout');
    } catch {}
    return { deleted: true, id: query.id };
  }
});
