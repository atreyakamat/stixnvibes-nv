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

export const POST = createApiHandler({
  requireAdmin: true,
  bodySchema: CollectionSchema,
  handler: async ({ body }) => {
    const safeRevalidate = () => {
      try {
        revalidatePath('/', 'layout');
      } catch {}
    };

    let result;
    const cleanId = body.id || undefined;
    const cleanPayload = {
      name: body.name,
      slug: body.slug || body.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-"),
      description: body.description ?? null,
      image_url: body.image_url ?? null,
      is_active: body.is_active ?? true,
      sort_order: body.sort_order ?? 0,
      metadata: body.metadata ?? {},
    };

    if (cleanId) {
      const existing = await collectionService.getCollectionById(cleanId).catch(() => null);
      if (existing) {
        result = await collectionService.updateCollection(cleanId, cleanPayload);
      } else {
        result = await collectionService.createCollection({ ...cleanPayload, id: cleanId });
      }
    } else {
      result = await collectionService.createCollection(cleanPayload);
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
