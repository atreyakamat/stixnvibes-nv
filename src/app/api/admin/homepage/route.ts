import { createApiHandler } from "@/lib/api-handler";
import { SettingsService } from "@/lib/services/settings-service";
import { z } from "zod";

import { revalidatePath } from "next/cache";

const settingsService = new SettingsService();

const DEFAULT_SECTIONS = [
  { id: "hero", name: "Hero Banner", enabled: true, sort_order: 1, headline: "Stick Loud. Vibe Harder.", subheadline: "Premium stickers, posters, Spotify cards & frames." },
  { id: "categories", name: "Featured Categories", enabled: true, sort_order: 2 },
  { id: "bestsellers", name: "Best Sellers", enabled: true, sort_order: 3 },
  { id: "new_arrivals", name: "New Arrivals", enabled: true, sort_order: 4 },
  { id: "customize", name: "Live Customizer Showcase", enabled: true, sort_order: 5 },
  { id: "collections", name: "Trending Collections", enabled: true, sort_order: 6 },
  { id: "why_us", name: "Why Choose Us", enabled: true, sort_order: 7 },
  { id: "reviews", name: "Customer Reviews", enabled: true, sort_order: 8 },
  { id: "instagram", name: "Instagram Feed", enabled: true, sort_order: 9 },
  { id: "newsletter", name: "Newsletter Signup", enabled: true, sort_order: 10 },
];

export const GET = createApiHandler({
  requireAdmin: true,
  handler: async () => {
    const layout = await settingsService.getSetting("homepage_layout");
    return layout ?? DEFAULT_SECTIONS;
  },
});

export const POST = createApiHandler({
  requireAdmin: true,
  bodySchema: z.object({
    sections: z.array(z.any()),
  }),
  handler: async ({ body }) => {
    const updated = await settingsService.setSetting("homepage_layout", body.sections, "cms", "Homepage sections layout configuration");
    revalidatePath('/', 'layout');
    return { saved: true, data: updated.value };
  },
});
