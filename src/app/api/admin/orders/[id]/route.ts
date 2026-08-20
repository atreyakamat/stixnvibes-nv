export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { createApiHandler } from "@/lib/api-handler";
import { NotFoundError } from "@/lib/errors";
import { getNextStates, requiresInventoryRelease, OrderStatus } from "@/lib/state-machine/order-state-machine";

export const GET = createApiHandler({
  requireAdmin: true,
  handler: async ({ params }) => {
    const orderId = params?.id;
    if (!orderId) {
      throw new NotFoundError("Order ID is required");
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            productionJobs: {
              include: {
                qcInspections: true,
              },
            },
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
        },
        reservations: {
          orderBy: { createdAt: "desc" },
        },
        inventoryLedger: {
          orderBy: { createdAt: "desc" },
        },
        shipment: {
          include: {
            events: {
              orderBy: { timestamp: "desc" },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError(`Order ${orderId} not found`);
    }

    // Build Chronological Timeline from persisted DB events
    const timeline: Array<{
      id: string;
      timestamp: Date;
      title: string;
      description: string;
      category: "order" | "payment" | "inventory" | "production" | "qc" | "shipping";
    }> = [];

    // 1. Order created
    timeline.push({
      id: `ord-created-${order.id}`,
      timestamp: order.createdAt,
      title: "Order Placed",
      description: `Order created by ${order.customerName} for ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(order.totalCents / 100)}`,
      category: "order",
    });

    // 2. Payments
    for (const p of order.payments) {
      if (p.paidAt) {
        timeline.push({
          id: `pay-${p.id}`,
          timestamp: p.paidAt,
          title: "Payment Captured",
          description: `Captured ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(p.amountCents / 100)} via ${p.provider} (Ref: ${p.providerPaymentId || p.providerOrderId || "N/A"})`,
          category: "payment",
        });
      } else if (p.status === "failed") {
        timeline.push({
          id: `pay-fail-${p.id}`,
          timestamp: p.updatedAt,
          title: "Payment Failed",
          description: `Payment attempt failed: ${p.failureReason || "Declined"}`,
          category: "payment",
        });
      }
    }

    // 3. Inventory ledger
    for (const l of order.inventoryLedger) {
      timeline.push({
        id: `ledger-${l.id}`,
        timestamp: l.createdAt,
        title: l.entryType === "reservation" ? "Inventory Reserved" : l.entryType === "release" ? "Inventory Released" : "Inventory Mutation",
        description: `${l.quantity > 0 ? "+" : ""}${l.quantity} units (${l.previousStock} -> ${l.newStock}) — ${l.reason || "System"}`,
        category: "inventory",
      });
    }

    // 4. Production jobs & QC
    for (const item of order.items) {
      for (const job of item.productionJobs) {
        timeline.push({
          id: `job-${job.id}`,
          timestamp: job.createdAt,
          title: `Production Job: ${item.name}`,
          description: `Status: ${job.status}`,
          category: "production",
        });

        for (const qc of job.qcInspections) {
          timeline.push({
            id: `qc-${qc.id}`,
            timestamp: qc.createdAt,
            title: qc.result === "passed" ? `QC Passed: ${item.name}` : `QC Failed: ${item.name}`,
            description: `Inspected by ${qc.operator}${qc.failureReason ? ` (Reason: ${qc.failureReason})` : ""}`,
            category: "qc",
          });
        }
      }
    }

    // 5. Shipment
    if (order.shipment) {
      timeline.push({
        id: `ship-${order.shipment.id}`,
        timestamp: order.shipment.createdAt,
        title: `Shipment Manifested (${order.shipment.courier})`,
        description: `AWB: ${order.shipment.awb} | Status: ${order.shipment.status}`,
        category: "shipping",
      });

      for (const ev of order.shipment.events) {
        timeline.push({
          id: `shipev-${ev.id}`,
          timestamp: ev.timestamp,
          title: `Transit Event: ${ev.status}`,
          description: `${ev.location ? `${ev.location} — ` : ""}${ev.description || "In transit"}`,
          category: "shipping",
        });
      }
    }

    // Sort timeline chronologically (most recent first)
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Calculate valid next transitions from domain state machine
    const validNextActions = getNextStates(order.status as OrderStatus);

    return {
      ...order,
      timeline,
      validNextActions,
      actionsRequiringRelease: validNextActions.filter((next) =>
        requiresInventoryRelease(order.status as OrderStatus, next)
      ),
    };
  },
});
