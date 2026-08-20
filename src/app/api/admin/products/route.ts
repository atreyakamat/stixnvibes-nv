export const dynamic = "force-dynamic";
import { ProductService } from "@/lib/services/product-service";
import { createApiHandler } from "@/lib/api-handler";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const productService = new ProductService();

export const GET = createApiHandler({
  requireAdmin: true,
  querySchema: z.object({
    type: z.string().optional(),
    status: z.string().optional(),
    search: z.string().optional(),
    limit: z.coerce.number().default(200),
  }),
  handler: async ({ query }) => {
    return await productService.getProducts(query);
  }
});

const BulkOperationSchema = z.object({
  bulkAction: z.enum(["delete", "status"]).optional(),
  ids: z.array(z.string().uuid()).optional(),
  status: z.string().optional(),
});

const ProductPayloadSchema = z.object({
  bulkAction: z.enum(["delete", "status"]).optional(),
  ids: z.array(z.string().uuid()).optional(),
  status: z.string().optional(),
  id: z.string().uuid().optional(),
}).passthrough();

export const POST = createApiHandler({
  requireAdmin: true,
  bodySchema: ProductPayloadSchema,
  handler: async ({ body }) => {
    const safeRevalidate = () => {
      try {
        revalidatePath('/', 'layout');
      } catch {}
    };

    // Handle Bulk Operations
    if (body.bulkAction && body.ids) {
      if (body.bulkAction === "delete") {
        const count = await productService.bulkDeleteProducts(body.ids);
        safeRevalidate();
        return { deleted: true, count };
      }
      if (body.bulkAction === "status" && body.status) {
        const count = await productService.bulkUpdateProductStatus(body.ids, body.status);
        safeRevalidate();
        return { updated: true, count, status: body.status };
      }
    }

    // Handle Single Product Create or Update
    let result;
    if (body.id) {
      const existing = await productService.getProductById(body.id);
      if (existing) {
        result = await productService.updateProduct(body.id, body as unknown as Parameters<typeof productService.updateProduct>[1]);
      } else {
        result = await productService.createProduct(body as unknown as Parameters<typeof productService.createProduct>[0]);
      }
    } else {
      result = await productService.createProduct(body as unknown as Parameters<typeof productService.createProduct>[0]);
    }
    safeRevalidate();
    return result;
  }
});

export const DELETE = createApiHandler({
  requireAdmin: true,
  querySchema: z.object({ id: z.string().uuid() }),
  handler: async ({ query }) => {
    await productService.deleteProduct(query.id);
    try {
      revalidatePath('/', 'layout');
    } catch {}
    return { deleted: true };
  }
});
