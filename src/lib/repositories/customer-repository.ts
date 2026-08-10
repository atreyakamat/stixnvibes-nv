import { prisma } from "@/lib/prisma";

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
  async updateCustomerCrm(id: string, data: any) {
    await prisma.storeSetting.upsert({
      where: { key: `crm_customer_${id}` },
      update: {
        category: "crm_customers",
        value: data,
      },
      create: {
        key: `crm_customer_${id}`,
        category: "crm_customers",
        value: data,
      },
    });
  }

  async deleteCustomerCrm(id: string) {
    await prisma.storeSetting.delete({
      where: { key: `crm_customer_${id}` },
    }).catch(() => {});
  }

  async getCustomerSummaries(params: {
    search?: string;
    sortBy?: string;
    limit?: number;
  }): Promise<CustomerSummaryRecord[]> {
    const limit = Math.min(params.limit ?? 100, 500);

    const crmSettings = await prisma.storeSetting.findMany({
      where: { category: "crm_customers" },
      select: { key: true, value: true },
    });

    const crmMap = new Map<string, any>();
    for (const s of crmSettings) {
      if (s.key.startsWith("crm_customer_")) {
        const id = s.key.replace("crm_customer_", "");
        crmMap.set(id, s.value);
      }
    }

    const orders = await prisma.order.findMany({
      select: {
        customerName: true,
        customerPhone: true,
        customerEmail: true,
        totalCents: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    const customerMap = new Map<string, CustomerSummaryRecord>();
    for (const order of orders) {
      const id = order.customerPhone || order.customerEmail || order.customerName;
      const crmData = crmMap.get(id) || {};
      const existing = customerMap.get(id);

      if (existing) {
        existing.total_orders += 1;
        existing.total_spent += order.totalCents || 0;
        if (order.createdAt > new Date(existing.last_order_at)) {
          existing.last_order_at = order.createdAt.toISOString();
          if (!crmData.customer_name) existing.customer_name = order.customerName;
        }
        if (order.createdAt < new Date(existing.first_order_at)) {
          existing.first_order_at = order.createdAt.toISOString();
        }
      } else {
        customerMap.set(id, {
          id,
          customer_name: crmData.customer_name || order.customerName,
          customer_phone: crmData.customer_phone || order.customerPhone,
          customer_email: crmData.customer_email || order.customerEmail,
          total_orders: 1,
          total_spent: order.totalCents || 0,
          last_order_at: order.createdAt.toISOString(),
          first_order_at: order.createdAt.toISOString(),
          vip: crmData.vip,
          blacklisted: crmData.blacklisted,
          blacklist_reason: crmData.blacklist_reason,
          notes: crmData.notes,
          favourite_products: crmData.favourite_products,
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
          favourite_products: crmData.favourite_products,
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
