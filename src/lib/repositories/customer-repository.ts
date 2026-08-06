import { createService } from "@/lib/supabase/service";
import type { Database } from "@/types/supabase";

export interface CustomerSummaryRecord {
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  total_orders: number;
  total_spent: number;
  last_order_at: string;
  first_order_at: string;
}

export class CustomerRepository {
  private getClient() {
    const service = createService();
    if (!service) throw new Error("Database service unavailable");
    return service;
  }

  async getCustomerSummaries(params: {
    search?: string;
    sortBy?: string;
    limit?: number;
  }): Promise<CustomerSummaryRecord[]> {
    const client = this.getClient();
    const limit = Math.min(params.limit ?? 100, 500);

    // Try customer_summary view first
    const { data: viewData, error: viewError } = await client
      .from("customer_summary")
      .select("*")
      .limit(limit);

    if (!viewError && viewData) {
      let customers: CustomerSummaryRecord[] = (viewData ?? []).map((c) => ({
        customer_name: c.customer_name ?? "Customer",
        customer_phone: c.customer_phone ?? "",
        customer_email: c.customer_email ?? null,
        total_orders: c.total_orders ?? 0,
        total_spent: c.total_spent ?? 0,
        last_order_at: c.last_order_at ?? new Date().toISOString(),
        first_order_at: c.first_order_at ?? new Date().toISOString(),
      }));

      if (params.search) {
        const term = params.search.toLowerCase();
        customers = customers.filter(
          (c) =>
            c.customer_name.toLowerCase().includes(term) ||
            c.customer_phone.includes(term) ||
            (c.customer_email && c.customer_email.toLowerCase().includes(term))
        );
      }

      customers.sort((a, b) => {
        if (params.sortBy === "total_spent") return b.total_spent - a.total_spent;
        if (params.sortBy === "total_orders") return b.total_orders - a.total_orders;
        return new Date(b.last_order_at).getTime() - new Date(a.last_order_at).getTime();
      });

      return customers;
    }

    // Fallback to orders aggregation
    const { data: orders, error: ordersErr } = await client
      .from("orders")
      .select("customer_name, customer_phone, customer_email, total_cents, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (ordersErr) throw ordersErr;

    const customerMap = new Map<string, CustomerSummaryRecord>();
    for (const order of orders ?? []) {
      const key = order.customer_phone || order.customer_email || order.customer_name;
      const existing = customerMap.get(key);
      if (existing) {
        existing.total_orders += 1;
        existing.total_spent += order.total_cents || 0;
        if (order.created_at > existing.last_order_at) {
          existing.last_order_at = order.created_at;
          existing.customer_name = order.customer_name;
        }
        if (order.created_at < existing.first_order_at) {
          existing.first_order_at = order.created_at;
        }
      } else {
        customerMap.set(key, {
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          customer_email: order.customer_email,
          total_orders: 1,
          total_spent: order.total_cents || 0,
          last_order_at: order.created_at,
          first_order_at: order.created_at,
        });
      }
    }

    let customers = Array.from(customerMap.values());
    if (params.search) {
      const term = params.search.toLowerCase();
      customers = customers.filter(
        (c) =>
          c.customer_name.toLowerCase().includes(term) ||
          c.customer_phone.includes(term) ||
          (c.customer_email && c.customer_email.toLowerCase().includes(term))
      );
    }
    customers.sort((a, b) => {
      if (params.sortBy === "total_spent") return b.total_spent - a.total_spent;
      if (params.sortBy === "total_orders") return b.total_orders - a.total_orders;
      return new Date(b.last_order_at).getTime() - new Date(a.last_order_at).getTime();
    });

    return customers.slice(0, limit);
  }
}
