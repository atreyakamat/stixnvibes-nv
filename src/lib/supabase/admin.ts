/**
 * Helper functions for admin CRUD operations.
 * These use the service-role client (server-side) so they bypass RLS.
 * An untyped client is used here intentionally — supabase-js strongly-typed
 * generics can be excessively strict for admin inserts/updates;
 * for read paths the schemas queries module (`queries.ts`) is properly typed.
 */
import { createService } from "./service";

function getService() {
  const client = createService();
  if (!client) throw new Error("Supabase service client not configured");
  // Strip Database generic for untyped CRUD ergonomics in admin tooling.
  // (rls bypassed via service role; we trust caller-supplied payloads here.)
  return client as unknown as {
    from: (table: string) => {
      select: (cols?: string) => Promise<{ data: any[] | null; error: any }>;
      insert: (rows: any | any[]) => { select: (cols?: string) => Promise<{ data: any | null; error: any }> & { single: () => Promise<{ data: any | null; error: any }> } };
      update: (rows: any) => { eq: (col: string, val: any) => { single: () => Promise<{ data: any | null; error: any }> } };
      delete: () => { eq: (col: string, val: any) => Promise<{ data: any | null; error: any }> };
    };
  };
}

type AdminList = {};

export const admin = {
  // ---------- Categories ----------
  async listCategories() {
    const { data, error } = await getService().from("categories").select("*");
    if (error) throw error;
    return data ?? [];
  },
  async createCategory(payload: { name: string; slug: string; parent_id?: string }) {
    const { data, error } = await getService().from("categories").insert(payload).select().single();
    if (error) throw error;
    return data;
  },
  async updateCategory(id: string, payload: Partial<{ name: string; slug: string; parent_id: string }>) {
    const { data, error } = await getService().from("categories").update(payload).eq("id", id).single();
    if (error) throw error;
    return data;
  },
  async deleteCategory(id: string) {
    const { data, error } = await getService().from("categories").delete().eq("id", id);
    if (error) throw error;
    return data;
  },

  // ---------- Products ----------
  async listProducts() {
    const { data, error } = await getService().from("products").select("*");
    if (error) throw error;
    return data ?? [];
  },
  async createProduct(payload: Record<string, any>) {
    const { data, error } = await getService().from("products").insert(payload).select().single();
    if (error) throw error;
    return data;
  },
  async updateProduct(id: string, payload: Record<string, any>) {
    const { data, error } = await getService().from("products").update(payload).eq("id", id).single();
    if (error) throw error;
    return data;
  },
  async deleteProduct(id: string) {
    const { data, error } = await getService().from("products").delete().eq("id", id);
    if (error) throw error;
    return data;
  },

  // ---------- Variants ----------
  async listVariants() {
    const { data, error } = await getService().from("variants").select("*");
    if (error) throw error;
    return data ?? [];
  },
  async createVariant(payload: Record<string, any>) {
    const { data, error } = await getService().from("variants").insert(payload).select().single();
    if (error) throw error;
    return data;
  },
  async updateVariant(id: string, payload: Record<string, any>) {
    const { data, error } = await getService().from("variants").update(payload).eq("id", id).single();
    if (error) throw error;
    return data;
  },
  async deleteVariant(id: string) {
    const { data, error } = await getService().from("variants").delete().eq("id", id);
    if (error) throw error;
    return data;
  },
};

void (0 satisfies AdminList);
