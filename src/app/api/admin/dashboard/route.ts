export const dynamic = "force-dynamic";
import { createApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";

export const GET = createApiHandler({
  requireAdmin: true,
  handler: async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const [
      allOrders,
      allProducts,
      todayOrders,
      thisMonthOrders,
      lastMonthOrders,
      lowStockData,
      recentOrdersData,
      paymentQueueCount,
      productionQueueCount,
      qcQueueCount,
      packingQueueCount,
      shippingQueueCount,
      deliveredCount,
      cancelledCount,
      activeReservationsCount,
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
      // Payment Queue
      prisma.order.count({
        where: { status: { in: ["created", "sent", "confirmed", "payment_failed"] } },
      }),
      // Production Queue
      prisma.order.count({
        where: { status: { in: ["paid", "production", "printing"] } },
      }),
      // QC Queue
      prisma.order.count({
        where: { status: { in: ["qc", "qc_failed"] } },
      }),
      // Packing Queue
      prisma.order.count({
        where: { status: { in: ["packing"] } },
      }),
      // Shipping Queue
      prisma.order.count({
        where: { status: { in: ["shipped"] } },
      }),
      // Delivered
      prisma.order.count({
        where: { status: { in: ["delivered"] } },
      }),
      // Cancelled
      prisma.order.count({
        where: { status: { in: ["cancelled", "refunded"] } },
      }),
      // Active Reservations
      prisma.inventoryReservation.count({
        where: { status: "active" },
      }),
      prisma.order.count({
        where: { 
          status: { notIn: ["cancelled", "refunded", "delivered", "fulfilled"] },
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

    return {
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
        delivered: deliveredCount,
        cancelled: cancelledCount,
        delayed: delayedCount,
      },
      operational_queues: {
        payment_pending: paymentQueueCount,
        production_active: productionQueueCount,
        qc_inspection: qcQueueCount,
        ready_to_pack: packingQueueCount,
        in_transit: shippingQueueCount,
        active_reservations: activeReservationsCount,
      },
      products: {
        total: allProducts.length,
        active: activeProducts,
        out_of_stock: outOfStockProducts,
        low_stock: lowStockData,
      },
      best_sellers: bestSellers,
      recent_orders: recentOrdersData,
    };
  }
});
