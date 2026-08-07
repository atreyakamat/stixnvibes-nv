import { createService } from "@/lib/supabase/service";
import type { Database, OrderStatus } from "@/types/supabase";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];
type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];

export interface OrderListParams {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
  sort?: "created_at" | "total_cents";
  order?: "asc" | "desc";
}

export class OrderRepository {
  private getClient() {
    const service = createService();
    if (!service) throw new Error("Database service unavailable");
    return service;
  }

  async list(params: OrderListParams = {}): Promise<{ data: (OrderRow & { items?: OrderItemRow[] })[]; total: number }> {
    const client = this.getClient();
    const limit = Math.min(params.limit ?? 100, 500);
    const offset = params.offset ?? 0;
    const sortField = params.sort ?? "created_at";
    const sortOrder = params.order ?? "desc";

    let query = client.from("orders").select("*, order_items(*)", { count: "exact" });

    if (params.search) {
      const term = `%${params.search.toLowerCase()}%`;
      query = query.or(`customer_name.ilike.${term},customer_phone.ilike.${term},customer_email.ilike.${term},id.ilike.${term}`);
    }

    if (params.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }

    query = query
      .order(sortField, { ascending: sortOrder === "asc" })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;
    return { data: (data ?? []) as (OrderRow & { items?: OrderItemRow[] })[], total: count ?? 0 };
  }

  async findById(id: string): Promise<(OrderRow & { items: OrderItemRow[] }) | null> {
    const client = this.getClient();
    const { data, error } = await client
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data as (OrderRow & { items: OrderItemRow[] });
  }

  async create(payload: OrderInsert, items: Array<Database["public"]["Tables"]["order_items"]["Insert"]>): Promise<OrderRow> {
    const client = this.getClient();
    const { data: order, error: orderErr } = await client
      .from("orders")
      .insert(payload)
      .select()
      .single();

    if (orderErr) throw orderErr;

    if (items.length > 0) {
      const itemPayloads = items.map((it) => ({
        ...it,
        order_id: order.id,
      }));
      const { error: itemsErr } = await client.from("order_items").insert(itemPayloads);
      if (itemsErr) throw itemsErr;
    }

    return order as OrderRow;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<OrderRow> {
    const client = this.getClient();
    const { data, error } = await client
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as OrderRow;
  }

  async updateNotes(id: string, notes: string): Promise<OrderRow> {
    const client = this.getClient();
    const { data, error } = await client
      .from("orders")
      .update({ notes, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as OrderRow;
  }

  async updateTracking(id: string, tracking_number: string, courier: string): Promise<OrderRow> {
    const client = this.getClient();
    const { data: existing, error: fetchErr } = await client.from("orders").select("metadata").eq("id", id).single();
    if (fetchErr) throw fetchErr;

    const metadata = (existing.metadata as Record<string, any>) || {};
    if (tracking_number !== undefined) metadata.tracking_number = tracking_number;
    if (courier !== undefined) metadata.courier = courier;

    const { data, error } = await client
      .from("orders")
      .update({ metadata, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as OrderRow;
  }
}
