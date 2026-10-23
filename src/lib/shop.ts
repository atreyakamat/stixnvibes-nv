import "server-only";
import { cache } from "react";
import { getStoreOrNull } from "@/lib/store";
import { DEFAULT_SETTINGS } from "@/lib/store/seed";
import type { Collection, Offer, Product, Settings } from "@/lib/types";

export type ShopState = {
  products: Product[];
  collections: Collection[];
  offers: Offer[];
  settings: Settings;
  mode: "supabase" | "demo" | null;
};

/**
 * Catalog, offers and settings for storefront pages, deduped per request.
 * Returns empty data instead of throwing when the database isn't
 * configured, so the build and an unconfigured deploy still render.
 */
export const getShopState = cache(async (): Promise<ShopState> => {
  const empty: ShopState = { products: [], collections: [], offers: [], settings: DEFAULT_SETTINGS, mode: null };
  const store = getStoreOrNull();
  if (!store) return empty;
  try {
    const [products, collections, offers, settings] = await Promise.all([
      store.listProducts(),
      store.listCollections(),
      store.listOffers(),
      store.getSettings(),
    ]);
    return { products, collections, offers, settings, mode: store.mode };
  } catch (err) {
    console.error("[shop] failed to load catalog", err);
    return { ...empty, mode: store.mode };
  }
});

export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  const { products } = await getShopState();
  return products.find((p) => p.slug === slug) ?? null;
});

/** Collection cover: its own image, or the first product photo in it. */
export function collectionCover(c: Collection, products: Product[]): string | null {
  return c.image || products.find((p) => p.collectionIds.includes(c.id) && p.images[0])?.images[0] || null;
}
