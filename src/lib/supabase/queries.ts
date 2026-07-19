import { createBrowser } from "./client";
import type { Database } from "@/types/supabase";

/** Helper for fetching public data (no auth required) */
export async function fetchCategories() {
  const supabase = createBrowser();
  if (!supabase) return [];
  const { data, error } = await supabase.from("categories").select("id, name, slug, parent_id");
  if (error) console.error(error);
  return data ?? [];
}

export async function fetchProducts() {
  const supabase = createBrowser();
  if (!supabase) return [];
  const { data, error } = await supabase.from("products").select("*, category:categories!inner(name, slug)");
  if (error) console.error(error);
  return data ?? [];
}

export async function fetchProductBySlug(slug: string) {
  const supabase = createBrowser();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories!inner(name, slug)")
    .eq("slug", slug)
    .single();
  if (error) console.error(error);
  return data ?? null;
}

export async function fetchProductsByCategory(slug: string) {
  const supabase = createBrowser();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories!inner(name, slug)")
    .eq("category.slug", slug);
  if (error) console.error(error);
  return data ?? [];
}
