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
    // Handle Bulk Operations
    if (body.bulkAction && body.ids) {
      if (body.bulkAction === "delete") {
        const count = await productService.bulkDeleteProducts(body.ids);
        revalidatePath('/', 'layout');
        return { deleted: true, count };
      }
      if (body.bulkAction === "status" && body.status) {
        const count = await productService.bulkUpdateProductStatus(body.ids, body.status);
        revalidatePath('/', 'layout');
        return { updated: true, count, status: body.status };
      }
    }

    // Handle Single Product Create or Update
    let result;
    if (body.id) {
      result = await productService.updateProduct(body.id, body as any);
    } else {
      result = await productService.createProduct(body as any);
    }
    revalidatePath('/', 'layout');
    return result;
  }
});

export const DELETE = createApiHandler({
  requireAdmin: true,
  querySchema: z.object({ id: z.string().uuid() }),
  handler: async ({ query }) => {
    await productService.deleteProduct(query.id);
    revalidatePath('/', 'layout');
    return { deleted: true };
  }
});
