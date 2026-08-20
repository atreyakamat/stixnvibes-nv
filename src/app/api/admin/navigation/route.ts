export const dynamic = "force-dynamic";
import { createApiHandler } from "@/lib/api-handler";
import { SettingsService } from "@/lib/services/settings-service";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const settingsService = new SettingsService();

export const GET = createApiHandler({
  requireAdmin: true,
  handler: async () => {
    return await settingsService.getNavigation();
  },
});

const navItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string(),
  visible: z.boolean().optional().default(true),
  is_external: z.boolean().optional().default(false),
  sort_order: z.number().int().optional(),
});

const postBodySchema = z.object({
  navigation: z.array(navItemSchema),
});

export const POST = createApiHandler({
  requireAdmin: true,
  bodySchema: postBodySchema,
  handler: async ({ body }) => {
    const updated = await settingsService.setNavigation(body.navigation);
    try {
      revalidatePath('/', 'layout');
    } catch {}
    return { saved: true, data: updated };
  },
});
