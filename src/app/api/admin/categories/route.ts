export const dynamic = "force-dynamic";
import { CategoryService } from "@/lib/services/category-service";
import { createApiHandler } from "@/lib/api-handler";
import { revalidatePath } from "next/cache";
import { CategorySchema } from "@/lib/validations/category";
import { z } from "zod";

const categoryService = new CategoryService();

export const GET = createApiHandler({
  requireAdmin: true,
  handler: async () => {
    return await categoryService.getCategoryTree();
  }
});

const CategoryPayloadSchema = CategorySchema.extend({
  id: z.string().uuid().optional(),
});

export const POST = createApiHandler({
  requireAdmin: true,
  bodySchema: CategoryPayloadSchema,
  handler: async ({ body }) => {
    const safeRevalidate = () => {
      try {
        revalidatePath('/', 'layout');
      } catch {}
    };

    let result;
    if (body.id) {
      const existing = await categoryService.getCategoryById(body.id);
      if (existing) {
        result = await categoryService.updateCategory(body.id, body);
      } else {
        result = await categoryService.createCategory(body);
      }
    } else {
      result = await categoryService.createCategory(body);
    }
    safeRevalidate();
    return result;
  }
});

export const DELETE = createApiHandler({
  requireAdmin: true,
  querySchema: z.object({ id: z.string().uuid() }),
  handler: async ({ query }) => {
    await categoryService.deleteCategory(query.id);
    try {
      revalidatePath('/', 'layout');
    } catch {}
    return { deleted: true, id: query.id };
  }
});
