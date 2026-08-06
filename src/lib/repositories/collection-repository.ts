import { createService } from "@/lib/supabase/service";
import type { Database } from "@/types/supabase";

type CollectionRow = Database["public"]["Tables"]["collections"]["Row"];
type CollectionInsert = Database["public"]["Tables"]["collections"]["Insert"];
type CollectionUpdate = Database["public"]["Tables"]["collections"]["Update"];

export class CollectionRepository {
  private getClient() {
    const service = createService();
    if (!service) throw new Error("Database service unavailable");
    return service;
  }

  async list(): Promise<(CollectionRow & { product_count?: number })[]> {
    const client = this.getClient();
    const { data, error } = await client
      .from("collections")
      .select("*, product_collections(product_id)")
      .order("sort_order", { ascending: true });

    if (error) throw error;

    return (data ?? []).map((c) => {
      const { product_collections, ...rest } = c as typeof c & { product_collections?: { product_id: string }[] };
      return {
        ...rest,
        product_count: Array.isArray(product_collections) ? product_collections.length : 0,
      };
    });
  }

  async findById(id: string): Promise<CollectionRow | null> {
    const client = this.getClient();
    const { data, error } = await client.from("collections").select("*").eq("id", id).single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data as CollectionRow;
  }

  async create(payload: CollectionInsert): Promise<CollectionRow> {
    const client = this.getClient();
    const { data, error } = await client.from("collections").insert(payload).select().single();
    if (error) throw error;
    return data as CollectionRow;
  }

  async update(id: string, payload: CollectionUpdate): Promise<CollectionRow> {
    const client = this.getClient();
    const { data, error } = await client.from("collections").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data as CollectionRow;
  }

  async delete(id: string): Promise<boolean> {
    const client = this.getClient();
    const { error } = await client.from("collections").delete().eq("id", id);
    if (error) throw error;
    return true;
  }
}
