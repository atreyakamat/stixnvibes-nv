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

/**
 * GET /api/admin/customers — List customer summaries aggregated from orders
 * Supports ?search=<term> and ?sort=<total_spent|total_orders|last_order_at>
 */
export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const admin = createService();
  if (!admin) return bad("Database not configured", 503);

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const sortBy = url.searchParams.get("sort") || "last_order_at";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);

  // Try the customer_summary view first (created by migration)
  const { data: viewData, error: viewError } = await admin
    .from("customer_summary" as any)
    .select("*")
    .limit(limit);

  if (!viewError && viewData) {
    let customers = viewData as any[];
    if (search) {
      const term = search.toLowerCase();
      customers = customers.filter(
        (c) =>
          (c.customer_name && c.customer_name.toLowerCase().includes(term)) ||
          (c.customer_phone && c.customer_phone.includes(term)) ||
          (c.customer_email && c.customer_email?.toLowerCase().includes(term))
      );
    }
    // Sort
    customers.sort((a, b) => {
      if (sortBy === "total_spent") return (b.total_spent ?? 0) - (a.total_spent ?? 0);
      if (sortBy === "total_orders") return (b.total_orders ?? 0) - (a.total_orders ?? 0);
      return new Date(b.last_order_at ?? 0).getTime() - new Date(a.last_order_at ?? 0).getTime();
    });
    return ok(customers);
  }

  // Fallback: aggregate from orders table directly
  const { data: orders, error: ordersErr } = await admin
    .from("orders")
    .select("customer_name, customer_phone, customer_email, total_cents, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (ordersErr) return bad(ordersErr.message, 500);

  const customerMap = new Map<string, {
    customer_name: string;
    customer_phone: string;
    customer_email: string | null;
    total_orders: number;
    total_spent: number;
    last_order_at: string;
    first_order_at: string;
  }>();

  for (const order of (orders as any[])) {
    const key = order.customer_phone || order.customer_email || order.customer_name;
    const existing = customerMap.get(key);
    if (existing) {
      existing.total_orders += 1;
      existing.total_spent += order.total_cents || 0;
      if (order.created_at > existing.last_order_at) {
        existing.last_order_at = order.created_at;
        existing.customer_name = order.customer_name; // use latest name
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
}
