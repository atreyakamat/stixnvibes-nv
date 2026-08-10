import { createApiHandler } from "@/lib/api-handler";
import { PageService } from "@/lib/services/page-service";
import { z } from "zod";

const pageService = new PageService();

export const GET = createApiHandler({
  requireAdmin: true,
  querySchema: z.object({
    slug: z.string().optional(),
  }),
  handler: async ({ query }) => {
    if (query.slug) {
      const page = await pageService.getPageBySlug(query.slug);
      if (!page) {
        throw new Error("Page not found");
      }
      return page;
    }
    return await pageService.getPages();
  },
});

const pageSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  slug: z.string().optional(),
  content: z.any().optional(),
  is_published: z.boolean().optional(),
  seo_title: z.string().optional().nullable(),
  seo_description: z.string().optional().nullable(),
});

export const POST = createApiHandler({
  requireAdmin: true,
  bodySchema: pageSchema,
  handler: async ({ body }) => {
    if (body.id) {
      return await pageService.updatePage(body.id, body);
    } else {
      const slug = body.slug || body.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
      return await pageService.createPage({ ...body, slug });
    }
  },
});

export const DELETE = createApiHandler({
  requireAdmin: true,
  querySchema: z.object({
    id: z.string().min(1, "Missing page ID"),
  }),
  handler: async ({ query }) => {
    await pageService.deletePage(query.id);
    return { deleted: true, id: query.id };
  },
});
