import { createService } from "@/lib/supabase/service";
import type { Database } from "@/types/supabase";

type SettingRow = Database["public"]["Tables"]["settings"]["Row"];

export class SettingsRepository {
  private getClient() {
    const service = createService();
    if (!service) throw new Error("Database service unavailable");
    return service;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const client = this.getClient();
    const { data, error } = await client
      .from("settings")
      .select("value")
      .eq("key", key)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return (data?.value as T) ?? null;
  }

  async list(category?: string): Promise<SettingRow[]> {
    const client = this.getClient();
    let query = client.from("settings").select("*");
    if (category) {
      query = query.eq("category", category);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as SettingRow[];
  }

  async set(key: string, value: unknown, category = "general", description?: string): Promise<SettingRow> {
    const client = this.getClient();
    const { data, error } = await client
      .from("settings")
      .upsert({
        key,
        value: value as any,
        category,
        description: description || null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as SettingRow;
  }

  async delete(key: string): Promise<boolean> {
    const client = this.getClient();
    const { error } = await client.from("settings").delete().eq("key", key);
    if (error) throw error;
    return true;
  }
}
