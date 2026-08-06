export const dynamic = "force-dynamic";
import { NextResponse, type NextRequest } from "next/server";
import { createService } from "@/lib/supabase/service";
import { requireAdminAuth } from "@/lib/auth-guard";

function ok(data: unknown) {
  return NextResponse.json({ ok: true, data });
}
function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

function isConnectionError(message: string): boolean {
  const msg = message.toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("econnrefused") ||
    msg.includes("networkerror") ||
    msg.includes("failed to fetch") ||
    msg.includes("connect econnrefused")
  );
}

export interface CustomerSummaryItem {
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  total_orders: number;
  total_spent: number;
  last_order_at: string;
  first_order_at: string;
}

/**
 * GET /api/admin/customers — List customer summaries aggregated from orders
 */
export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const admin = createService();
  if (!admin) return bad("Database service unconfigured or unavailable", 503);

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const sortBy = url.searchParams.get("sort") || "last_order_at";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);

  try {
    // Try the customer_summary view first
    const { data: viewData, error: viewError } = await admin
      .from("customer_summary")
      .select("*")
      .limit(limit);

    if (!viewError && viewData) {
      let customers = (viewData ?? []).map((c) => ({
        customer_name: c.customer_name ?? "Customer",
        customer_phone: c.customer_phone ?? "",
        customer_email: c.customer_email ?? null,
        total_orders: c.total_orders ?? 0,
        total_spent: c.total_spent ?? 0,
        last_order_at: c.last_order_at ?? new Date().toISOString(),
        first_order_at: c.first_order_at ?? new Date().toISOString(),
      }));

      if (search) {
        const term = search.toLowerCase();
        customers = customers.filter(
          (c) =>
            (c.customer_name && c.customer_name.toLowerCase().includes(term)) ||
            (c.customer_phone && c.customer_phone.includes(term)) ||
            (c.customer_email && c.customer_email.toLowerCase().includes(term))
        );
      }
      customers.sort((a, b) => {
        if (sortBy === "total_spent") return b.total_spent - a.total_spent;
        if (sortBy === "total_orders") return b.total_orders - a.total_orders;
        return new Date(b.last_order_at).getTime() - new Date(a.last_order_at).getTime();
      });
      return ok(customers);
    }

    // Fallback: aggregate from orders table directly
    const { data: orders, error: ordersErr } = await admin
      .from("orders")
      .select("customer_name, customer_phone, customer_email, total_cents, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (ordersErr) {
      console.error("[/api/admin/customers GET]", ordersErr.message);
      if (isConnectionError(ordersErr.message)) {
        return bad(`Database connection failed: ${ordersErr.message}`, 503);
      }
      return bad(ordersErr.message, 500);
    }

    const customerMap = new Map<string, CustomerSummaryItem>();

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
    if (search) {
      const term = search.toLowerCase();
      customers = customers.filter(
        (c) =>
          c.customer_name.toLowerCase().includes(term) ||
          c.customer_phone.includes(term) ||
          (c.customer_email && c.customer_email.toLowerCase().includes(term))
      );
    }
    customers.sort((a, b) => {
      if (sortBy === "total_spent") return b.total_spent - a.total_spent;
      if (sortBy === "total_orders") return b.total_orders - a.total_orders;
      return new Date(b.last_order_at).getTime() - new Date(a.last_order_at).getTime();
    });

    return ok(customers.slice(0, limit));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/admin/customers GET catch]", msg);
    if (isConnectionError(msg)) {
      return bad(`Database connection error: ${msg}`, 503);
    }
    return bad(msg, 500);
  }
}
