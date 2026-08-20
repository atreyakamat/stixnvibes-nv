import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as checkoutHandler } from "@/app/api/checkout/route";
import { POST as transitionHandler } from "@/app/api/orders/[id]/transition/route";
import { POST as operationsHandler } from "@/app/api/admin/operations/route";
import { POST as createProductHandler } from "@/app/api/admin/products/route";
import { randomUUID } from "crypto";

describe("Adversarial Business Gates & Failure Invariant Tests", () => {
  let productId: string;
  let orderId: string;
  const adminHeaders = {
    authorization: "Bearer snv_admin_token_static_dev",
    "content-type": "application/json",
  };

  beforeEach(async () => {
    productId = randomUUID();
    await prisma.product.create({
      data: {
        id: productId,
        name: "Adversarial Test Item",
        slug: `adv-test-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        priceCents: 50000,
        stock: 5,
        type: "sticker",
      },
    });
  });

  afterEach(async () => {
    try {
      if (orderId) {
        await prisma.shipment.deleteMany({ where: { orderId } });
        await prisma.qualityCheck.deleteMany({ where: { productionJob: { orderItem: { orderId } } } });
        await prisma.productionJob.deleteMany({ where: { orderItem: { orderId } } });
        await prisma.inventoryReservation.deleteMany({ where: { orderId } });
        await prisma.inventoryLedgerEntry.deleteMany({ where: { orderId } });
        await prisma.orderItem.deleteMany({ where: { orderId } });
        await prisma.order.deleteMany({ where: { id: orderId } });
      }
      await prisma.inventoryReservation.deleteMany({ where: { productId } });
      await prisma.inventoryLedgerEntry.deleteMany({ where: { productId } });
      await prisma.product.deleteMany({ where: { id: productId } });
    } catch (e) {}
  });

  it("Gate 1: Unauthorized Admin Mutation Rejection", async () => {
    // Attempt to create a product without admin authentication
    const req = new Request("http://localhost/api/admin/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Hacker Sticker",
        priceCents: 100,
        stock: 10,
        type: "sticker",
      }),
    });

    // In production or with missing/invalid auth header, requireAdminAuth blocks access
    const badAuthReq = new Request("http://localhost/api/admin/products", {
      method: "POST",
      headers: {
        authorization: "Bearer invalid_fake_token_12345",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Hacker Sticker",
        priceCents: 100,
        stock: 10,
        type: "sticker",
      }),
    });

    const res = await createProductHandler(badAuthReq as any, {} as any);
    // Should be rejected with 401 Unauthorized
    expect(res.status).toBe(401);
  });

  it("Gate 2: Insufficient Stock Rejection & Complete Transaction Rollback", async () => {
    // Product has stock = 5, customer attempts to buy 10
    const req = new Request("http://localhost/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: [
          {
            id: randomUUID(),
            productId,
            name: "Adversarial Test Item",
            price_cents: 50000,
            quantity: 10,
          },
        ],
        shippingAddress: {
          name: "Greedy Buyer",
          phone: "+919876543210",
          address: "123 Test Street",
          pincode: "560001",
        },
      }),
    });

    const res = await checkoutHandler(req as any, {} as any);
    expect(res.status).toBe(500); // Or 400 bad request / out of stock

    // Invariant: Product stock is still 5, zero order rows created
    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product?.stock).toBe(5);

    const orders = await prisma.order.findMany({ where: { customerName: "Greedy Buyer" } });
    expect(orders.length).toBe(0);
  });

  it("Gate 3: Invalid PIN Code Rejection", async () => {
    const req = new Request("http://localhost/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: [
          {
            id: randomUUID(),
            productId,
            name: "Adversarial Test Item",
            price_cents: 50000,
            quantity: 1,
          },
        ],
        shippingAddress: {
          name: "Invalid Pincode Customer",
          phone: "+919876543210",
          address: "123 Test Street",
          pincode: "INVALID_PIN", // Invalid format
        },
      }),
    });

    const res = await checkoutHandler(req as any, {} as any);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toMatch(/PIN code/i);
  });

  it("Gate 4: State Machine Bypass Rejection (Skipping QC / Skipping Production)", async () => {
    orderId = randomUUID();
    await prisma.order.create({
      data: {
        id: orderId,
        customerName: "Bypass Tester",
        customerPhone: "+919876543210",
        address: "Address",
        pincode: "560001",
        totalCents: 50000,
        status: "paid",
      },
    });

    // Attempt illegal jump: paid -> packing (skipping production and QC)
    const req = new Request(`http://localhost/api/orders/${orderId}/transition`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ status: "packing" }),
    });

    const res = await transitionHandler(req as any, { params: { id: orderId } });
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toMatch(/Invalid order state transition/i);

    // Invariant: Order status remains 'paid'
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe("paid");
  });

  it("Gate 5: Shipping Un-Packed Order & Duplicate Shipment Conflict", async () => {
    orderId = randomUUID();
    await prisma.order.create({
      data: {
        id: orderId,
        customerName: "Premature Shipment Tester",
        customerPhone: "+919876543210",
        address: "Address",
        pincode: "560001",
        totalCents: 50000,
        status: "production", // Order is still in production!
      },
    });

    // Attempt to manifest shipment while in production
    const req = new Request("http://localhost/api/admin/operations", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        action: "create_shipment",
        orderId,
        courier: "BlueDart",
        awb: "AWB-INVALID-1",
      }),
    });

    const res = await operationsHandler(req as any, {} as any);
    expect(res.status).toBe(400);

    // Set order to packing and create first valid shipment
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "packing" },
    });

    const validReq = new Request("http://localhost/api/admin/operations", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        action: "create_shipment",
        orderId,
        courier: "BlueDart",
        awb: `AWB-VALID-${Date.now()}`,
      }),
    });
    const validRes = await operationsHandler(validReq as any, {} as any);
    expect(validRes.status).toBe(200);

    // Attempt duplicate shipment on already shipped order
    const dupReq = new Request("http://localhost/api/admin/operations", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        action: "create_shipment",
        orderId,
        courier: "Delhivery",
        awb: `AWB-DUP-${Date.now()}`,
      }),
    });
    const dupRes = await operationsHandler(dupReq as any, {} as any);
    expect(dupRes.status).toBe(409); // 409 Conflict
  });
});
