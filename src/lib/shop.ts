import "server-only";
import { cache } from "react";
import { getStoreOrNull } from "@/lib/store";
import type { Product, Settings } from "@/lib/types";

/**
 * Catalog + settings for storefront pages, deduped per request. Returns
 * empty data instead of throwing when the database isn't configured, so
 * the build and an unconfigured deploy still render.
 */
export const getShopState = cache(
  async (): Promise<{ products: Product[]; settings: Settings | null; mode: "supabase" | "demo" | null }> => {
    const store = getStoreOrNull();
    if (!store) return { products: [], settings: null, mode: null };
    try {
      const [products, settings] = await Promise.all([store.listProducts(), store.getSettings()]);
      return { products, settings, mode: store.mode };
    } catch (err) {
      console.error("[shop] failed to load catalog", err);
      return { products: [], settings: null, mode: store.mode };
    }
  },
);

export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  const { products } = await getShopState();
  return products.find((p) => p.slug === slug) ?? null;
});
