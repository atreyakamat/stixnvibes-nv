import { createService } from "@/lib/supabase/service";
import type { Database } from "@/types/supabase";

type MaterialRow = Database["public"]["Tables"]["materials"]["Row"];
type MaterialInsert = Database["public"]["Tables"]["materials"]["Insert"];
type MaterialUpdate = Database["public"]["Tables"]["materials"]["Update"];

export class MaterialRepository {
  private getClient() {
    const service = createService();
    if (!service) throw new Error("Database service unavailable");
    return service;
  }

  async list(): Promise<MaterialRow[]> {
    const client = this.getClient();
    const { data, error } = await client
      .from("materials")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return (data ?? []) as MaterialRow[];
  }

  async create(payload: MaterialInsert): Promise<MaterialRow> {
    const client = this.getClient();
    const { data, error } = await client.from("materials").insert(payload).select().single();
    if (error) throw error;
    return data as MaterialRow;
  }

  async update(id: string, payload: MaterialUpdate): Promise<MaterialRow> {
    const client = this.getClient();
    const { data, error } = await client.from("materials").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data as MaterialRow;
  }

  async delete(id: string): Promise<boolean> {
    const client = this.getClient();
    const { error } = await client.from("materials").delete().eq("id", id);
    if (error) throw error;
    return true;
  }
}
