export const dynamic = "force-dynamic";
import { CollectionService } from "@/lib/services/collection-service";
import { createApiHandler } from "@/lib/api-handler";
import { revalidatePath } from "next/cache";
import { CollectionSchema } from "@/lib/validations/collection";
import { z } from "zod";

const collectionService = new CollectionService();

export const GET = createApiHandler({
  requireAdmin: true,
  handler: async () => {
    return await collectionService.getCollections();
  }
});

const CollectionPayloadSchema = CollectionSchema.extend({
  id: z.string().uuid().optional(),
});

export const POST = createApiHandler({
  requireAdmin: true,
  bodySchema: CollectionPayloadSchema,
  handler: async ({ body }) => {
    const safeRevalidate = () => {
      try {
        revalidatePath('/', 'layout');
      } catch {}
    };

    let result;
    if (body.id) {
      const existing = await collectionService.getCollectionById(body.id);
      if (existing) {
        result = await collectionService.updateCollection(body.id, body);
      } else {
        result = await collectionService.createCollection(body);
      }
    } else {
      result = await collectionService.createCollection(body);
    }
    safeRevalidate();
    return result;
  }
});

export const DELETE = createApiHandler({
  requireAdmin: true,
  querySchema: z.object({ id: z.string().uuid() }),
  handler: async ({ query }) => {
    await collectionService.deleteCollection(query.id);
    try {
      revalidatePath('/', 'layout');
    } catch {}
    return { deleted: true, id: query.id };
  }
});
