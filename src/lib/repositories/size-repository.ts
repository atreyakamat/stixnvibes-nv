import { createService } from "@/lib/supabase/service";
import type { Database } from "@/types/supabase";

type SizeRow = Database["public"]["Tables"]["sizes"]["Row"];
type SizeInsert = Database["public"]["Tables"]["sizes"]["Insert"];
type SizeUpdate = Database["public"]["Tables"]["sizes"]["Update"];

export class SizeRepository {
  private getClient() {
    const service = createService();
    if (!service) throw new Error("Database service unavailable");
    return service;
  }

  async list(category?: string): Promise<SizeRow[]> {
    const client = this.getClient();
    let query = client.from("sizes").select("*").order("sort_order", { ascending: true });
    if (category && category !== "all") {
      query = query.eq("category", category);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as SizeRow[];
  }

  async create(payload: SizeInsert): Promise<SizeRow> {
    const client = this.getClient();
    const { data, error } = await client.from("sizes").insert(payload).select().single();
    if (error) throw error;
    return data as SizeRow;
  }

  async update(id: string, payload: SizeUpdate): Promise<SizeRow> {
    const client = this.getClient();
    const { data, error } = await client.from("sizes").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data as SizeRow;
  }

  async delete(id: string): Promise<boolean> {
    const client = this.getClient();
    const { error } = await client.from("sizes").delete().eq("id", id);
    if (error) throw error;
    return true;
  }
}
