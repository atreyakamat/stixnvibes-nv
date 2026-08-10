import { createApiHandler } from "@/lib/api-handler";
import { CustomerService } from "@/lib/services/customer-service";
import { z } from "zod";

const customerService = new CustomerService();

export const GET = createApiHandler({
  requireAdmin: true,
  querySchema: z.object({
    search: z.string().optional(),
    sort: z.string().optional().default("last_order_at"),
    limit: z.coerce.number().min(1).max(500).optional().default(100),
  }),
  handler: async ({ query }) => {
    return await customerService.getCustomers({
      search: query.search,
      sortBy: query.sort as "total_spent" | "orders_count" | "last_order_at" | "created_at" | undefined,
      limit: query.limit,
    });
  },
});

export const POST = createApiHandler({
  requireAdmin: true,
  bodySchema: z.object({
    id: z.string().optional(),
    customer_phone: z.string().optional(),
    customer_email: z.string().optional(),
    customer_name: z.string().optional(),
    vip: z.boolean().optional(),
    blacklisted: z.boolean().optional(),
    blacklist_reason: z.string().optional(),
    notes: z.string().optional(),
    favourite_products: z.array(z.string()).optional(),
  }),
  handler: async ({ body }) => {
    const id = body.id || body.customer_phone || body.customer_email || body.customer_name;
    if (!id) {
      throw new Error("Missing customer identifier");
    }
    await customerService.updateCustomer(id, {
      customer_name: body.customer_name,
      customer_phone: body.customer_phone,
      customer_email: body.customer_email,
      vip: body.vip,
      blacklisted: body.blacklisted,
      blacklist_reason: body.blacklist_reason,
      notes: body.notes,
      favourite_products: body.favourite_products,
    });
    return { success: true };
  },
});

export const DELETE = createApiHandler({
  requireAdmin: true,
  querySchema: z.object({
    id: z.string().min(1, "Missing id"),
  }),
  handler: async ({ query }) => {
    await customerService.deleteCustomer(query.id);
    return { success: true };
  },
});
