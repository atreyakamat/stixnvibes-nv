import { createService } from "@/lib/supabase/service";
import type { Database } from "@/types/supabase";

type PageRow = Database["public"]["Tables"]["pages"]["Row"];
type PageInsert = Database["public"]["Tables"]["pages"]["Insert"];
type PageUpdate = Database["public"]["Tables"]["pages"]["Update"];

export class PageRepository {
  private getClient() {
    const service = createService();
    if (!service) throw new Error("Database service unavailable");
    return service;
  }

  async list(): Promise<PageRow[]> {
    const client = this.getClient();
    const { data, error } = await client
      .from("pages")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as PageRow[];
  }

  async findBySlug(slug: string): Promise<PageRow | null> {
    const client = this.getClient();
    const { data, error } = await client.from("pages").select("*").eq("slug", slug).single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data as PageRow;
  }

  async create(payload: PageInsert): Promise<PageRow> {
    const client = this.getClient();
    const { data, error } = await client.from("pages").insert(payload).select().single();
    if (error) throw error;
    return data as PageRow;
  }

  async update(id: string, payload: PageUpdate): Promise<PageRow> {
    const client = this.getClient();
    const { data, error } = await client.from("pages").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data as PageRow;
  }

  async delete(id: string): Promise<boolean> {
    const client = this.getClient();
    const { error } = await client.from("pages").delete().eq("id", id);
    if (error) throw error;
    return true;
  }
}
