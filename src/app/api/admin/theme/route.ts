import { createApiHandler } from "@/lib/api-handler";
import { SettingsService } from "@/lib/services/settings-service";
import { z } from "zod";

import { revalidatePath } from "next/cache";

const settingsService = new SettingsService();

export const GET = createApiHandler({
  requireAdmin: true,
  handler: async () => {
    return await settingsService.getTheme();
  },
});

export const POST = createApiHandler({
  requireAdmin: true,
  bodySchema: z.object({
    theme: z.record(z.string(), z.any()),
  }),
  handler: async ({ body }) => {
    const updated = await settingsService.setTheme(body.theme);
    revalidatePath('/', 'layout');
    return { saved: true, data: updated };
  },
});
