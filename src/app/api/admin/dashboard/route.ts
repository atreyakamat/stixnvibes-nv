export const dynamic = "force-dynamic";
import { type NextRequest } from "next/server";
import { createService } from "@/lib/supabase/service";
import { ApiResponse, handleApiError } from "@/lib/api-response";
import { requireAdminAuth } from "@/lib/auth-guard";

/**
 * GET /api/admin/dashboard — Aggregated business KPIs
 * Returns revenue, order counts, product stats, customer stats
 */
export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const admin = createService();
  if (!admin) return ApiResponse.unavailable("Database service unconfigured or unavailable");

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  try {
    const [
      ordersRes,
      productsRes,
      todayOrdersRes,
      thisMonthOrdersRes,
      lastMonthOrdersRes,
      lowStockRes,
      recentOrdersRes,
    ] = await Promise.all([
      admin.from("orders").select("id, total_cents, status, created_at", { count: "exact" }),
      admin.from("products").select("id, stock, status", { count: "exact" }),
      admin.from("orders").select("id, total_cents").gte("created_at", today),
      admin.from("orders").select("id, total_cents").gte("created_at", thisMonthStart),
      admin.from("orders").select("id, total_cents")
        .gte("created_at", lastMonthStart)
        .lt("created_at", thisMonthStart),
      admin.from("products").select("id, name, stock, image_url").lt("stock", 10).order("stock", { ascending: true }).limit(10),
      admin.from("orders").select("id, order_number, customer_name, total_cents, status, created_at")
        .order("created_at", { ascending: false }).limit(10),
    ]);

    const firstError =
      ordersRes.error ||
      productsRes.error ||
      todayOrdersRes.error ||
      thisMonthOrdersRes.error ||
      lastMonthOrdersRes.error ||
      lowStockRes.error ||
      recentOrdersRes.error;

    if (firstError) {
      throw firstError;
    }

    const allOrders = ordersRes.data ?? [];
    const allProducts = productsRes.data ?? [];
    const todayOrders = todayOrdersRes.data ?? [];
    const thisMonthOrders = thisMonthOrdersRes.data ?? [];
    const lastMonthOrders = lastMonthOrdersRes.data ?? [];
    const lowStockData = lowStockRes.data ?? [];
    const recentOrdersData = recentOrdersRes.data ?? [];

    // Calculate revenue
    const totalRevenue = allOrders.reduce((sum, o) => sum + (o.total_cents || 0), 0);
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total_cents || 0), 0);
    const thisMonthRevenue = thisMonthOrders.reduce((sum, o) => sum + (o.total_cents || 0), 0);
    const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + (o.total_cents || 0), 0);
    const revenueGrowth = lastMonthRevenue > 0
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : thisMonthRevenue > 0 ? 100 : 0;

    // Order status breakdown
    const statusBreakdown = allOrders.reduce((acc: Record<string, number>, o) => {
      const s = o.status || "pending";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    // Product breakdown
    const activeProducts = allProducts.filter((p) => p.status === "active").length;
    const outOfStockProducts = allProducts.filter((p) => (p.stock ?? 0) <= 0).length;

    const avgOrderValue = allOrders.length > 0 ? Math.round(totalRevenue / allOrders.length) : 0;

    return ApiResponse.success({
      revenue: {
        total: totalRevenue,
        today: todayRevenue,
        this_month: thisMonthRevenue,
        last_month: lastMonthRevenue,
        growth_percent: revenueGrowth,
        avg_order_value: avgOrderValue,
      },
      orders: {
        total: ordersRes.count ?? allOrders.length,
        today: todayOrders.length,
        this_month: thisMonthOrders.length,
        status_breakdown: statusBreakdown,
        pending: (statusBreakdown["pending"] || 0) + (statusBreakdown["created"] || 0) + (statusBreakdown["WAITING_FOR_CONFIRMATION"] || 0),
      },
      products: {
        total: productsRes.count ?? allProducts.length,
        active: activeProducts,
        out_of_stock: outOfStockProducts,
        low_stock: lowStockData,
      },
      recent_orders: recentOrdersData,
    });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
