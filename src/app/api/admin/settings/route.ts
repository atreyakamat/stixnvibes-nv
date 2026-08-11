import { createApiHandler } from "@/lib/api-handler";
import { SettingsService } from "@/lib/services/settings-service";
import { z } from "zod";

import { revalidatePath } from "next/cache";

const settingsService = new SettingsService();

export const GET = createApiHandler({
  requireAdmin: true,
  querySchema: z.object({
    category: z.string().optional(),
    key: z.string().optional(),
  }),
  handler: async ({ query }) => {
    if (query.key) {
      const val = await settingsService.getSetting(query.key);
      return { key: query.key, value: val };
    }
    return await settingsService.listSettings(query.category);
  },
});

export const POST = createApiHandler({
  requireAdmin: true,
  bodySchema: z.object({
    key: z.string().min(1, "Missing required setting key"),
    value: z.any(),
    category: z.string().optional(),
    description: z.string().optional(),
  }),
  handler: async ({ body }) => {
    const result = await settingsService.setSetting(
      body.key,
      body.value,
      body.category,
      body.description
    );
    revalidatePath('/', 'layout');
    return result;
  },
});

export const DELETE = createApiHandler({
  requireAdmin: true,
  querySchema: z.object({
    key: z.string().min(1, "Missing setting key to delete"),
  }),
  handler: async ({ query }) => {
    await settingsService.deleteSetting(query.key);
    revalidatePath('/', 'layout');
    return { deleted: true, key: query.key };
  },
});
