import { randomUUID } from "crypto";
import { createService } from "@/lib/supabase/service";
import type { Database } from "@/types/supabase";

type InventoryLogRow = Database["public"]["Tables"]["inventory_logs"]["Row"];

export interface InventoryLogParams {
  limit?: number;
  offset?: number;
  productId?: string;
}

export class InventoryRepository {
  private getClient() {
    const service = createService();
    if (!service) throw new Error("Database service unavailable");
    return service;
  }

  async getLogs(params: InventoryLogParams = {}): Promise<InventoryLogRow[]> {
    const client = this.getClient();
    const limit = Math.min(params.limit ?? 100, 500);
    const offset = params.offset ?? 0;

    let query = client
      .from("inventory_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (params.productId) {
      query = query.eq("product_id", params.productId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as InventoryLogRow[];
  }

  async recordMovement(params: {
    productId: string;
    change: number;
    reason: string;
    notes?: string | null;
    operator?: string;
  }): Promise<{ newStock: number; log: InventoryLogRow }> {
    const client = this.getClient();

    // 1. Fetch current stock
    const { data: prod, error: fetchErr } = await client
      .from("products")
      .select("id, name, stock")
      .eq("id", params.productId)
      .single();

    if (fetchErr) throw fetchErr;

    const previousStock = prod.stock ?? 0;
    const newStock = Math.max(0, previousStock + params.change);

    // 2. Update product stock
    const { error: updateErr } = await client
      .from("products")
      .update({ stock: newStock })
      .eq("id", params.productId);

    if (updateErr) throw updateErr;

    // 3. Log movement
    const logPayload = {
      id: randomUUID(),
      product_id: params.productId,
      product_name: prod.name ?? "Product",
      change: params.change,
      reason: params.reason,
      previous_stock: previousStock,
      new_stock: newStock,
      notes: params.notes || null,
      operator: params.operator || "admin",
    };

    const { data: log, error: logErr } = await client
      .from("inventory_logs")
      .insert(logPayload)
      .select()
      .single();

    if (logErr) throw logErr;

    return { newStock, log: log as InventoryLogRow };
  }
}
