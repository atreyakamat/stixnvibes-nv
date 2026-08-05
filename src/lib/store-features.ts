import { createService } from "@/lib/supabase/service";

export type FeatureFlags = {
  collections_enabled: boolean;
  materials_enabled: boolean;
  paper_materials_enabled: boolean;
  homepage_banner_enabled: boolean;
  reviews_enabled: boolean;
  wishlist_enabled: boolean;
  search_enabled: boolean;
  categories_enabled: boolean;
  custom_orders_enabled: boolean;
  offers_enabled: boolean;
  free_shipping_banner_enabled: boolean;
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  collections_enabled: true,
  materials_enabled: true,
  paper_materials_enabled: true,
  homepage_banner_enabled: true,
  reviews_enabled: true,
  wishlist_enabled: true,
  search_enabled: true,
  categories_enabled: true,
  custom_orders_enabled: true,
  offers_enabled: true,
  free_shipping_banner_enabled: true,
};

/**
 * Server-side helper to fetch store feature flags from the `settings` table.
 * Falls back cleanly to DEFAULT_FEATURE_FLAGS if Supabase is unconfigured or setting missing.
 */
export async function getStoreFeatureFlags(): Promise<FeatureFlags> {
  try {
    const admin = createService();
    if (!admin) return DEFAULT_FEATURE_FLAGS;

    const { data, error } = await admin
      .from("settings")
      .select("key, value")
      .eq("category", "features");

    if (error || !data || data.length === 0) return DEFAULT_FEATURE_FLAGS;

    const flags = { ...DEFAULT_FEATURE_FLAGS };
    for (const row of data) {
      const key = row.key as keyof FeatureFlags;
      if (key in flags) {
        const val = row.value;
        flags[key] = typeof val === "boolean" ? val : Boolean(val?.enabled ?? val?.value ?? true);
      }
    }
    return flags;
  } catch {
    return DEFAULT_FEATURE_FLAGS;
  }
}

/**
 * Server-side helper to fetch active database collections for navigation/storefront.
 */
export async function getActiveCollections() {
  try {
    const admin = createService();
    if (!admin) return [];

    const { data, error } = await admin
      .from("collections")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

/**
 * Server-side helper to fetch active materials with defaults.
 */
export async function getActiveMaterials() {
  try {
    const admin = createService();
    if (!admin) return [];

    const { data, error } = await admin
      .from("materials")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

/**
 * Server-side helper to fetch active sizes.
 */
export async function getActiveSizes(category?: string) {
  try {
    const admin = createService();
    if (!admin) return [];

    let q = admin.from("sizes").select("*").eq("is_active", true).order("sort_order", { ascending: true });
    if (category) q = q.eq("category", category);

    const { data, error } = await q;
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}
