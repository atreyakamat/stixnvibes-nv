import { createService } from "@/lib/supabase/service";
import type { Database } from "@/types/supabase";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

export interface ProductListParams {
  search?: string;
  type?: string;
  status?: string;
  visibility?: string;
  limit?: number;
  offset?: number;
  sort?: "name" | "price" | "stock" | "created_at";
  order?: "asc" | "desc";
}

export class ProductRepository {
  private getClient() {
    const service = createService();
    if (!service) throw new Error("Database service unavailable");
    return service;
  }

  async list(params: ProductListParams = {}): Promise<{ data: ProductRow[]; total: number }> {
    const client = this.getClient();
    const limit = Math.min(params.limit ?? 100, 500);
    const offset = params.offset ?? 0;
    const sortField = params.sort ?? "created_at";
    const sortOrder = params.order ?? "desc";

    let query = client.from("products").select("*", { count: "exact" });

    if (params.search) {
      const term = `%${params.search.toLowerCase()}%`;
      query = query.or(`name.ilike.${term},sku.ilike.${term},type.ilike.${term}`);
    }

    if (params.type && params.type !== "all") {
      query = query.eq("type", params.type);
    }

    if (params.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }

    if (params.visibility) {
      query = query.eq("visibility", params.visibility);
    }

    query = query
      .order(sortField, { ascending: sortOrder === "asc" })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;
    return { data: (data ?? []) as ProductRow[], total: count ?? 0 };
  }

  async findById(id: string): Promise<ProductRow | null> {
    const client = this.getClient();
    const { data, error } = await client
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data as ProductRow;
  }

  async findBySlug(slug: string): Promise<ProductRow | null> {
    const client = this.getClient();
    const { data, error } = await client
      .from("products")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data as ProductRow;
  }

  async create(payload: ProductInsert): Promise<ProductRow> {
    const client = this.getClient();
    const { data, error } = await client
      .from("products")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as ProductRow;
  }

  async update(id: string, payload: ProductUpdate): Promise<ProductRow> {
    const client = this.getClient();
    const { data, error } = await client
      .from("products")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as ProductRow;
  }

  async delete(id: string): Promise<boolean> {
    const client = this.getClient();
    const { error } = await client.from("products").delete().eq("id", id);
    if (error) throw error;
    return true;
  }

  async setVisibility(id: string, visibility: "visible" | "hidden" | "archived"): Promise<ProductRow> {
    return this.update(id, { visibility, status: visibility === "archived" ? "archived" : "active" });
  }
}
