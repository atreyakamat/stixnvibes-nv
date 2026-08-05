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
 * GET /api/admin/dashboard — Aggregated business KPIs
 * Returns revenue, order counts, product stats, customer stats
 */
export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const admin = createService();
  if (!admin) return bad("Database not configured", 503);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  // Parallel data fetches
  const [
    ordersRes,
    productsRes,
    todayOrdersRes,
    thisMonthOrdersRes,
    lastMonthOrdersRes,
    lowStockRes,
    recentOrdersRes,
  ] = await Promise.all([
    // Total orders
    admin.from("orders").select("id, total_cents, status, created_at", { count: "exact" }),
    // Total products
    admin.from("products").select("id, stock, status", { count: "exact" }),
    // Today's orders
    admin.from("orders").select("id, total_cents").gte("created_at", today),
    // This month's orders
    admin.from("orders").select("id, total_cents").gte("created_at", thisMonthStart),
    // Last month's orders
    admin.from("orders").select("id, total_cents")
      .gte("created_at", lastMonthStart)
      .lt("created_at", thisMonthStart),
    // Low stock products (stock < 10)
    admin.from("products").select("id, name, stock, image_url").lt("stock", 10).order("stock", { ascending: true }).limit(10),
    // Recent orders
    admin.from("orders").select("id, order_number, customer_name, total_cents, status, created_at")
      .order("created_at", { ascending: false }).limit(10),
  ]);

  const allOrders = (ordersRes.data as any[]) || [];
  const allProducts = (productsRes.data as any[]) || [];
  const todayOrders = (todayOrdersRes.data as any[]) || [];
  const thisMonthOrders = (thisMonthOrdersRes.data as any[]) || [];
  const lastMonthOrders = (lastMonthOrdersRes.data as any[]) || [];

  // Calculate revenue
  const totalRevenue = allOrders.reduce((sum, o) => sum + (o.total_cents || 0), 0);
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total_cents || 0), 0);
  const thisMonthRevenue = thisMonthOrders.reduce((sum, o) => sum + (o.total_cents || 0), 0);
  const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + (o.total_cents || 0), 0);
  const revenueGrowth = lastMonthRevenue > 0
    ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : thisMonthRevenue > 0 ? 100 : 0;

  // Order status breakdown
  const statusBreakdown: Record<string, number> = {};
  for (const o of allOrders) {
    statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
  }

  // Average order value
  const avgOrderValue = allOrders.length > 0
    ? Math.round(totalRevenue / allOrders.length)
    : 0;

  // Active vs out of stock products
  const outOfStock = allProducts.filter((p) => (p.stock ?? 0) <= 0).length;
  const activeProducts = allProducts.filter((p) => p.status !== "archived").length;

  return ok({
    revenue: {
      total: totalRevenue,
      today: todayRevenue,
      this_month: thisMonthRevenue,
      last_month: lastMonthRevenue,
      growth_percent: revenueGrowth,
      avg_order_value: avgOrderValue,
    },
    orders: {
      total: allOrders.length,
      today: todayOrders.length,
      this_month: thisMonthOrders.length,
      status_breakdown: statusBreakdown,
      pending: (statusBreakdown["created"] || 0) + (statusBreakdown["sent"] || 0),
    },
    products: {
      total: allProducts.length,
      active: activeProducts,
      out_of_stock: outOfStock,
      low_stock: (lowStockRes.data as any[]) || [],
    },
    recent_orders: (recentOrdersRes.data as any[]) || [],
  });
}
