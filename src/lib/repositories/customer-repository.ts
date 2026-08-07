import { createService } from "@/lib/supabase/service";
import type { Database } from "@/types/supabase";

export interface CustomerSummaryRecord {
  id?: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  total_orders: number;
  total_spent: number;
  last_order_at: string;
  first_order_at: string;
  vip?: boolean;
  blacklisted?: boolean;
  blacklist_reason?: string;
  notes?: string;
  favourite_products?: string;
}

export class CustomerRepository {
  private getClient() {
    const service = createService();
    if (!service) throw new Error("Database service unavailable");
    return service;
  }

  async updateCustomerCrm(id: string, data: any) {
    const client = this.getClient();
    const { error } = await client
      .from("settings")
      .upsert({
        key: `crm_customer_${id}`,
        category: "crm_customers",
        value: data,
        updated_at: new Date().toISOString()
      });
    if (error) throw error;
  }

  async deleteCustomerCrm(id: string) {
    const client = this.getClient();
    const { error } = await client
      .from("settings")
      .delete()
      .eq("key", `crm_customer_${id}`);
    if (error) throw error;
  }

  async getCustomerSummaries(params: {
    search?: string;
    sortBy?: string;
    limit?: number;
  }): Promise<CustomerSummaryRecord[]> {
    const client = this.getClient();
    const limit = Math.min(params.limit ?? 100, 500);
    
    // First fetch CRM settings to merge
    const { data: crmSettings } = await client
      .from("settings")
      .select("key, value")
      .eq("category", "crm_customers");
      
    const crmMap = new Map<string, any>();
    if (crmSettings) {
      for (const s of crmSettings) {
        if (s.key.startsWith("crm_customer_")) {
          const id = s.key.replace("crm_customer_", "");
          crmMap.set(id, s.value);
        }
      }
    }

    // Try customer_summary view first
    const { data: viewData, error: viewError } = await client
      .from("customer_summary")
      .select("*")
      .limit(limit);

    if (!viewError && viewData) {
      let customers: CustomerSummaryRecord[] = (viewData ?? []).map((c) => {
        const id = c.customer_phone || c.customer_email || c.customer_name || "unknown";
        const crmData = crmMap.get(id) || {};
        return {
          id,
          customer_name: crmData.customer_name || c.customer_name || "Customer",
          customer_phone: crmData.customer_phone || c.customer_phone || "",
          customer_email: crmData.customer_email || c.customer_email || null,
          total_orders: c.total_orders ?? 0,
          total_spent: c.total_spent ?? 0,
          last_order_at: c.last_order_at ?? new Date().toISOString(),
          first_order_at: c.first_order_at ?? new Date().toISOString(),
          vip: crmData.vip,
          blacklisted: crmData.blacklisted,
          blacklist_reason: crmData.blacklist_reason,
          notes: crmData.notes,
          favourite_products: crmData.favourite_products
        };
      });

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
      const id = order.customer_phone || order.customer_email || order.customer_name;
      const crmData = crmMap.get(id) || {};
      const existing = customerMap.get(id);
      
      if (existing) {
        existing.total_orders += 1;
        existing.total_spent += order.total_cents || 0;
        if (order.created_at > existing.last_order_at) {
          existing.last_order_at = order.created_at;
          if (!crmData.customer_name) existing.customer_name = order.customer_name;
        }
        if (order.created_at < existing.first_order_at) {
          existing.first_order_at = order.created_at;
        }
      } else {
        customerMap.set(id, {
          id,
          customer_name: crmData.customer_name || order.customer_name,
          customer_phone: crmData.customer_phone || order.customer_phone,
          customer_email: crmData.customer_email || order.customer_email,
          total_orders: 1,
          total_spent: order.total_cents || 0,
          last_order_at: order.created_at,
          first_order_at: order.created_at,
          vip: crmData.vip,
          blacklisted: crmData.blacklisted,
          blacklist_reason: crmData.blacklist_reason,
          notes: crmData.notes,
          favourite_products: crmData.favourite_products
        });
      }
    }

    // Also include crm only customers
    for (const [id, crmData] of crmMap.entries()) {
      if (!customerMap.has(id)) {
        customerMap.set(id, {
          id,
          customer_name: crmData.customer_name || "Unknown",
          customer_phone: crmData.customer_phone || id,
          customer_email: crmData.customer_email || null,
          total_orders: 0,
          total_spent: 0,
          last_order_at: new Date().toISOString(),
          first_order_at: new Date().toISOString(),
          vip: crmData.vip,
          blacklisted: crmData.blacklisted,
          blacklist_reason: crmData.blacklist_reason,
          notes: crmData.notes,
          favourite_products: crmData.favourite_products
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
