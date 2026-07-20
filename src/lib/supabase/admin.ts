/**
 * Helper functions for admin CRUD operations.
 * These use the service‑role client (server‑side) so they bypass RLS.
 */
import { createService } from './client';

/** Generic wrapper to get a service client – throws if not configured */
function getService() {
  const supabase = createService();
  if (!supabase) throw new Error('Supabase service client not configured');
  return supabase;
}

export const admin = {
  // ---------- Categories ----------
  async listCategories() {
    const { data, error } = await getService().from('categories').select('*');
    if (error) throw error;
    return data;
  },
  async createCategory(payload: { name: string; slug: string; parent_id?: string }) {
    const { data, error } = await getService()
      .from('categories')
      .insert(payload)
      .single();
    if (error) throw error;
    return data;
  },
  async updateCategory(id: string, payload: Partial<{ name: string; slug: string; parent_id: string }>) {
    const { data, error } = await getService()
      .from('categories')
      .update(payload)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },
  async deleteCategory(id: string) {
    const { data, error } = await getService().from('categories').delete().eq('id', id);
    if (error) throw error;
    return data;
  },

  // ---------- Products ----------
  async listProducts() {
    const { data, error } = await getService().from('products').select('*');
    if (error) throw error;
    return data;
  },
  async createProduct(payload: {
    name: string;
    slug: string;
    description?: string;
    short_description?: string;
    price_cents: number;
    image_url?: string;
    type: string;
    stock?: number;
    is_featured?: boolean;
    is_bundle?: boolean;
    bundle_ids?: string[];
  }) {
    const { data, error } = await getService()
      .from('products')
      .insert(payload)
      .single();
    if (error) throw error;
    return data;
  },
  async updateProduct(id: string, payload: Partial<Record<string, any>>) {
    const { data, error } = await getService()
      .from('products')
      .update(payload)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },
  async deleteProduct(id: string) {
    const { data, error } = await getService().from('products').delete().eq('id', id);
    if (error) throw error;
    return data;
  },

  // ---------- Variants ----------
  async listVariants() {
    const { data, error } = await getService().from('variants').select('*');
    if (error) throw error;
    return data;
  },
  async createVariant(payload: {
    product_id: string;
    name: string;
    price_modifier_cents?: number;
    stock?: number;
  }) {
    const { data, error } = await getService()
      .from('variants')
      .insert(payload)
      .single();
    if (error) throw error;
    return data;
  },
  async updateVariant(id: string, payload: Partial<Record<string, any>>) {
    const { data, error } = await getService()
      .from('variants')
      .update(payload)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },
  async deleteVariant(id: string) {
    const { data, error } = await getService().from('variants').delete().eq('id', id);
    if (error) throw error;
    return data;
  },
};
