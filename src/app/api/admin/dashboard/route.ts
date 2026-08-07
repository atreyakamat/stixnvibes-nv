export const dynamic = "force-dynamic";
import { type NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/api-response";
import { requireAdminAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  try {
    const [
      allOrders,
      allProducts,
      todayOrders,
      thisMonthOrders,
      lastMonthOrders,
      lowStockData,
      recentOrdersData,
      artworkCount,
      printCount,
      qcCount,
      packingCount,
      delayedCount,
      bestSellers
    ] = await Promise.all([
      prisma.order.findMany({
        select: { id: true, totalCents: true, status: true, createdAt: true },
      }),
      prisma.product.findMany({
        select: { id: true, stock: true },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: today } },
        select: { id: true, totalCents: true },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: thisMonthStart } },
        select: { id: true, totalCents: true },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } },
        select: { id: true, totalCents: true },
      }),
      prisma.product.findMany({
        where: { stock: { lt: 10 } },
        orderBy: { stock: 'asc' },
        take: 10,
        select: { id: true, name: true, stock: true, imageUrl: true },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, metadata: true, customerName: true, totalCents: true, status: true, createdAt: true },
      }),
      prisma.order.count({
        where: { status: { in: ["created", "sent"] as any } },
      }),
      prisma.order.count({
        where: { status: { in: ["confirmed"] as any } },
      }),
      prisma.order.count({
        where: { status: { in: ["paid"] as any } },
      }),
      prisma.order.count({
        where: { status: { in: ["fulfilled"] as any } },
      }),
      prisma.order.count({
        where: { 
          status: { notIn: ["cancelled", "refunded"] as any },
          createdAt: { lt: fortyEightHoursAgo }
        },
      }),
      prisma.product.findMany({
        where: { isFeatured: true },
        take: 5,
        select: { id: true, name: true, imageUrl: true, priceCents: true },
      }),
    ]);

    // Calculate revenue
    const totalRevenue = allOrders.reduce((sum, o) => sum + (o.totalCents || 0), 0);
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.totalCents || 0), 0);
    const thisMonthRevenue = thisMonthOrders.reduce((sum, o) => sum + (o.totalCents || 0), 0);
    const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + (o.totalCents || 0), 0);
    const revenueGrowth =
      lastMonthRevenue > 0
        ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : thisMonthRevenue > 0
        ? 100
        : 0;

    // Order status breakdown
    const statusBreakdown = allOrders.reduce((acc: Record<string, number>, o) => {
      const s = o.status || "pending";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    // Product breakdown
    const activeProducts = allProducts.length;
    const outOfStockProducts = allProducts.filter((p) => (p.stock ?? 0) <= 0).length;

    const avgOrderValue =
      allOrders.length > 0 ? Math.round(totalRevenue / allOrders.length) : 0;

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
        total: allOrders.length,
        today: todayOrders.length,
        this_month: thisMonthOrders.length,
        status_breakdown: statusBreakdown,
        pending: artworkCount,
        delayed: delayedCount,
      },
      production_queue: {
        artwork_review: artworkCount,
        printing: printCount,
        qc: qcCount,
        packing: packingCount,
        delayed: delayedCount,
      },
      products: {
        total: allProducts.length,
        active: activeProducts,
        out_of_stock: outOfStockProducts,
        low_stock: lowStockData,
      },
      best_sellers: bestSellers,
      recent_orders: recentOrdersData,
    });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
