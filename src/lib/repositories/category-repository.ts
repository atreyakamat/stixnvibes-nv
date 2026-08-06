import { createService } from "@/lib/supabase/service";
import type { Database } from "@/types/supabase";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"];
type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"];

export interface CategoryNode extends CategoryRow {
  children: CategoryNode[];
}

export class CategoryRepository {
  private getClient() {
    const service = createService();
    if (!service) throw new Error("Database service unavailable");
    return service;
  }

  async listAll(): Promise<CategoryRow[]> {
    const client = this.getClient();
    const { data, error } = await client
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return (data ?? []) as CategoryRow[];
  }

  async getTree(): Promise<{ flat: CategoryRow[]; tree: CategoryNode[] }> {
    const flat = await this.listAll();
    const map = new Map<string, CategoryNode>();
    const tree: CategoryNode[] = [];

    for (const cat of flat) {
      map.set(cat.id, { ...cat, children: [] });
    }
    for (const cat of flat) {
      const node = map.get(cat.id)!;
      if (cat.parent_id && map.has(cat.parent_id)) {
        map.get(cat.parent_id)!.children.push(node);
      } else {
        tree.push(node);
      }
    }

    return { flat, tree };
  }

  async create(payload: CategoryInsert): Promise<CategoryRow> {
    const client = this.getClient();
    const { data, error } = await client.from("categories").insert(payload).select().single();
    if (error) throw error;
    return data as CategoryRow;
  }

  async update(id: string, payload: CategoryUpdate): Promise<CategoryRow> {
    const client = this.getClient();
    const { data, error } = await client.from("categories").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data as CategoryRow;
  }

  async delete(id: string): Promise<boolean> {
    const client = this.getClient();
    const { error } = await client.from("categories").delete().eq("id", id);
    if (error) throw error;
    return true;
  }
}
