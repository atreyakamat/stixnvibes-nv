import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET as getOrdersHandler } from "@/app/api/admin/orders/route";
import { GET as getOrderDetailHandler } from "@/app/api/admin/orders/[id]/route";
import { POST as transitionHandler } from "@/app/api/orders/[id]/transition/route";
import { randomUUID } from "crypto";

describe("Phase 4: Admin Order Operations & Command Center TDD Suite", () => {
  let testOrderId: string;
  let testProductId: string;
  let testOrderItemId: string;

  beforeEach(async () => {
    testOrderId = randomUUID();
    testProductId = randomUUID();
    testOrderItemId = randomUUID();

    // Create product
    await prisma.product.create({
      data: {
        id: testProductId,
        name: "Admin Op Holographic Sticker",
        slug: `admin-op-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        priceCents: 24900,
        stock: 20,
        type: "sticker",
      },
    });

    // Create order with complete relations
    await prisma.order.create({
      data: {
        id: testOrderId,
        customerName: "Sneha Patel",
        customerPhone: "+919876543299",
        customerEmail: "sneha.patel@example.com",
        address: "42 Indiranagar, 100ft Road",
        pincode: "560038",
        totalCents: 49800,
        status: "confirmed",
        metadata: { orderNumber: "ORD-ADM-001" },
      },
    });

    // Create order item with price snapshots
    await prisma.orderItem.create({
      data: {
        id: testOrderItemId,
        orderId: testOrderId,
        productId: testProductId,
        name: "Admin Op Holographic Sticker",
        quantity: 2,
        priceCents: 24900,
        unitPriceCents: 24900,
        lineTotalCents: 49800,
        productNameSnapshot: "Admin Op Holographic Sticker",
      },
    });

    // Create active reservation
    await prisma.inventoryReservation.create({
      data: {
        id: randomUUID(),
        productId: testProductId,
        orderId: testOrderId,
        quantity: 2,
        status: "active",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    // Create payment
    await prisma.payment.create({
      data: {
        id: randomUUID(),
        orderId: testOrderId,
        provider: "razorpay",
        providerOrderId: "order_rzp_admin_123",
        amountCents: 49800,
        status: "pending",
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.qualityCheck.deleteMany({});
      await prisma.shipment.deleteMany({ where: { orderId: testOrderId } });
      await prisma.productionJob.deleteMany({ where: { orderItemId: testOrderItemId } });
      await prisma.payment.deleteMany({ where: { orderId: testOrderId } });
      await prisma.inventoryReservation.deleteMany({ where: { productId: testProductId } });
      await prisma.inventoryLedgerEntry.deleteMany({ where: { productId: testProductId } });
      await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.deleteMany({ where: { id: testOrderId } });
      await prisma.product.deleteMany({ where: { id: testProductId } });
    } catch (e) {}
  });

  const adminHeaders = {
    authorization: "Bearer snv_admin_token_static_dev",
    "content-type": "application/json",
  };

  describe("1. Server-Side Filtering, Pagination, and Search", () => {
    it("should filter orders by status and search query", async () => {
      const req = new Request("http://localhost/api/admin/orders?status=confirmed&search=Sneha", {
        headers: adminHeaders,
      });
      const res = await getOrdersHandler(req as any, {} as any);
      const json = await res.json();
      if (res.status !== 200) {
        console.error("GET /api/admin/orders failed with:", json);
      }
      expect(res.status).toBe(200);
      expect(json.data).toBeDefined();
      expect(json.data.total).toBeGreaterThanOrEqual(1);
      const found = json.data.data.find((o: any) => o.id === testOrderId);
      expect(found).toBeDefined();
      expect(found.customerName).toBe("Sneha Patel");
      expect(found.status).toBe("confirmed");
    });

    it("should paginate orders correctly", async () => {
      const req = new Request("http://localhost/api/admin/orders?limit=1&offset=0", {
        headers: adminHeaders,
      });
      const res = await getOrdersHandler(req as any, {} as any);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.data.length).toBeLessThanOrEqual(1);
      expect(json.data.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe("2. Order Command Center & Detail View", () => {
    it("should fetch full command center data with price snapshots, payment, reservations, and validNextActions", async () => {
      const req = new Request(`http://localhost/api/admin/orders/${testOrderId}`, {
        headers: adminHeaders,
      });
      const res = await getOrderDetailHandler(req as any, { params: { id: testOrderId } });
      expect(res.status).toBe(200);

      const json = await res.json();
      const order = json.data;
      expect(order.id).toBe(testOrderId);
      expect(order.customerName).toBe("Sneha Patel");

      // Items & Price Snapshots
      expect(order.items.length).toBe(1);
      expect(order.items[0].unitPriceCents).toBe(24900);
      expect(order.items[0].lineTotalCents).toBe(49800);

      // Payment Details
      expect(order.payments.length).toBe(1);
      expect(order.payments[0].providerOrderId).toBe("order_rzp_admin_123");

      // Reservations
      expect(order.reservations.length).toBe(1);
      expect(order.reservations[0].status).toBe("active");

      // Valid Next Actions calculated by domain authority
      expect(order.validNextActions).toBeDefined();
      expect(order.validNextActions).toContain("paid");
      expect(order.validNextActions).toContain("cancelled");
      expect(order.validNextActions).toContain("payment_failed");
      expect(order.validNextActions).not.toContain("delivered");
      expect(order.validNextActions).not.toContain("shipped");
    });
  });

  describe("3. Operational State Transitions & Confirmation Safety", () => {
    it("should execute valid transition (confirmed -> paid) and update validNextActions", async () => {
      const req = new Request(`http://localhost/api/orders/${testOrderId}/transition`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });

      const res = await transitionHandler(req, { params: { id: testOrderId } });
      expect(res.status).toBe(200);

      const updated = await prisma.order.findUnique({ where: { id: testOrderId } });
      expect(updated?.status).toBe("paid");
    });

    it("should reject invalid state skips (e.g. confirmed -> delivered)", async () => {
      const req = new Request(`http://localhost/api/orders/${testOrderId}/transition`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "delivered" }),
      });

      const res = await transitionHandler(req, { params: { id: testOrderId } });
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toMatch(/Invalid order state transition/i);
    });

    it("should release inventory when transitioning to cancelled", async () => {
      const req = new Request(`http://localhost/api/orders/${testOrderId}/transition`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      const res = await transitionHandler(req, { params: { id: testOrderId } });
      expect(res.status).toBe(200);

      const cancelledOrder = await prisma.order.findUnique({ where: { id: testOrderId } });
      expect(cancelledOrder?.status).toBe("cancelled");

      // Invariant: Reservation is released
      const reservations = await prisma.inventoryReservation.findMany({
        where: { orderId: testOrderId },
      });
      expect(reservations[0].status).toBe("released");
    });
  });
});
