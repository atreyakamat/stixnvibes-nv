import { createApiHandler } from "@/lib/api-handler";
import { SettingsService } from "@/lib/services/settings-service";
import { z } from "zod";

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
    return { saved: true, data: updated };
  },
});
