/**
 * Server-side data-access helpers for the public catalog.
 * Falls back to typed mock data when Supabase isn't configured, so the site
 * renders without a backend during development.
 */
import { createBrowser } from "@/lib/supabase/client";
import { createService } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";
import * as mock from "@/lib/data/products";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];

export type ProductWithCategory = ProductRow & {
  category?: Pick<CategoryRow, "name" | "slug"> | null;
};

export async function fetchCategories(): Promise<CategoryRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createBrowser();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");
  if (error) {
    console.error("[supabase] fetchCategories:", error.message);
    return [];
  }
  return (data ?? []) as CategoryRow[];
}

export async function fetchProductBySlug(slug: string): Promise<ProductWithCategory | null> {
  if (!isSupabaseConfigured()) {
    const mockProduct = mock.getProductBySlug(slug);
    return mockProduct ? toProductRow(mockProduct) : null;
  }
  const supabase = createService() ?? createBrowser();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(name, slug)")
    .eq("slug", slug)
    .single();
  if (error) {
    console.error("[supabase] fetchProductBySlug:", error.message);
    return null;
  }
  return data as ProductWithCategory;
}

export async function fetchFeaturedProducts(limit = 8): Promise<ProductWithCategory[]> {
  if (!isSupabaseConfigured()) {
    return mock.getBestSellers().slice(0, limit).map(toProductRow);
  }
  const supabase = createService() ?? createBrowser();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(name, slug)")
    .eq("is_featured", true)
    .order("rating", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[supabase] fetchFeaturedProducts:", error.message);
    return [];
  }
  return (data ?? []) as ProductWithCategory[];
}

export async function fetchProducts(opts: {
  categorySlug?: string;
  type?: Database["public"]["Enums"]["product_type"];
  limit?: number;
} = {}): Promise<ProductWithCategory[]> {
  if (!isSupabaseConfigured()) {
    let items = mock.products;
    if (opts.categorySlug) {
      const slug = opts.categorySlug.toLowerCase();
      items = items.filter(
        (p) => p.collection.toLowerCase() === slug || p.category.toLowerCase().replace(/ /g, "-") === slug
      );
    }
    if (opts.type) items = items.filter((p) => typeToDb(p.type) === opts.type);
    if (opts.limit) items = items.slice(0, opts.limit);
    return items.map(toProductRow);
  }
  const supabase = createService() ?? createBrowser();
  if (!supabase) return [];
  let q = supabase.from("products").select("*, category:categories(name, slug)");
  if (opts.type) q = q.eq("type", opts.type);
  if (opts.limit) q = q.limit(opts.limit);
  q = q.order("created_at", { ascending: false });
  const { data, error } = await q;
  if (error) {
    console.error("[supabase] fetchProducts:", error.message);
    return [];
  }
  return (data ?? []) as ProductWithCategory[];
}

export async function fetchReviews(productId: string, limit = 12): Promise<ReviewRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createBrowser();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[supabase] fetchReviews:", error.message);
    return [];
  }
  return (data ?? []) as ReviewRow[];
}

// ----- mappers -----

function typeToDb(t: mock.Product["type"]): Database["public"]["Enums"]["product_type"] {
  if (t === "sticker_normal") return "sticker";
  if (t === "sticker_vinyl") return "sticker_vinyl";
  return t;
}

function toProductRow(p: mock.Product): ProductWithCategory {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    short_description: p.description,
    price_cents: p.price * 100,
    compare_at_cents: p.compareAt ? p.compareAt * 100 : null,
    currency: "INR",
    image_url: p.image,
    images: p.images,
    type: typeToDb(p.type),
    category_id: null,
    collection: p.collection,
    tags: [...p.tags],
    stock: 50,
    is_featured: p.tags.includes("bestseller"),
    is_bundle: false,
    is_limited: false,
    bundle_ids: [],
    customizable: p.customizable,
    rating: p.rating,
    review_count: p.reviewCount,
    metadata: {},
    status: "active",
    visibility: "visible",
    sku: null,
    barcode: null,
    cost_cents: 0,
    weight_grams: null,
    seo_title: null,
    seo_description: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { name: p.category, slug: p.category.toLowerCase().replace(/ /g, "-") },
  };
}
