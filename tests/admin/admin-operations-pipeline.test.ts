import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as operationsHandler } from "@/app/api/admin/operations/route";
import { randomUUID } from "crypto";

describe("Phase 4: Admin Operations Pipeline API Tests", () => {
  let testOrderId: string;
  let testProductId: string;
  let testOrderItemId: string;
  let testJobId: string;

  const adminHeaders = {
    authorization: "Bearer snv_admin_token_static_dev",
    "content-type": "application/json",
  };

  beforeEach(async () => {
    testOrderId = randomUUID();
    testProductId = randomUUID();
    testOrderItemId = randomUUID();
    testJobId = randomUUID();

    await prisma.product.create({
      data: {
        id: testProductId,
        name: "Op Pipeline Test Sticker",
        slug: `op-pipe-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        priceCents: 15000,
        stock: 10,
        type: "sticker",
      },
    });

    await prisma.order.create({
      data: {
        id: testOrderId,
        customerName: "Arjun Verma",
        customerPhone: "+919123456789",
        address: "7th Main Road, Koramangala",
        pincode: "560034",
        totalCents: 30000,
        status: "qc",
      },
    });

    await prisma.orderItem.create({
      data: {
        id: testOrderItemId,
        orderId: testOrderId,
        productId: testProductId,
        name: "Op Pipeline Test Sticker",
        quantity: 2,
        priceCents: 15000,
      },
    });

    await prisma.productionJob.create({
      data: {
        id: testJobId,
        orderItemId: testOrderItemId,
        status: "completed",
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.qualityCheck.deleteMany({ where: { productionJob: { orderItemId: testOrderItemId } } });
      await prisma.shipmentEvent.deleteMany({ where: { shipment: { orderId: testOrderId } } });
      await prisma.shipment.deleteMany({ where: { orderId: testOrderId } });
      await prisma.productionJob.deleteMany({ where: { orderItemId: testOrderItemId } });
      await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.deleteMany({ where: { id: testOrderId } });
      await prisma.product.deleteMany({ where: { id: testProductId } });
    } catch (e) {}
  });

  it("QC Inspection: Submitting passing QC records inspection and moves order to packing", async () => {
    const req = new Request("http://localhost/api/admin/operations", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        action: "submit_qc",
        productionJobId: testJobId,
        operator: "QC Specialist Ananya",
        result: "pass",
        checklist: { adhesionPassed: true, colorAccuracyPassed: true },
      }),
    });

    const res = await operationsHandler(req as any, {} as any);
    expect(res.status).toBe(200);

    // Verify QC inspection was recorded in DB
    const inspections = await prisma.qualityCheck.findMany({
      where: { productionJobId: testJobId },
    });
    expect(inspections.length).toBe(1);
    expect(inspections[0].result).toBe("passed");
    expect(inspections[0].operator).toBe("QC Specialist Ananya");

    // Invariant: Order status rolled up to packing
    const order = await prisma.order.findUnique({ where: { id: testOrderId } });
    expect(order?.status).toBe("packing");
  });

  it("Shipment Manifest: Creating shipment on packing order assigns AWB and moves order to shipped", async () => {
    // Set order to packing
    await prisma.order.update({
      where: { id: testOrderId },
      data: { status: "packing" },
    });

    const awbNumber = `DELH-${Date.now()}`;
    const req = new Request("http://localhost/api/admin/operations", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        action: "create_shipment",
        orderId: testOrderId,
        courier: "Delhivery",
        awb: awbNumber,
      }),
    });

    const res = await operationsHandler(req as any, {} as any);
    expect(res.status).toBe(200);

    // Verify shipment was created
    const shipment = await prisma.shipment.findUnique({
      where: { orderId: testOrderId },
    });
    expect(shipment).toBeDefined();
    expect(shipment?.courier).toBe("Delhivery");
    expect(shipment?.awb).toBe(awbNumber);

    // Invariant: Order is now marked shipped
    const order = await prisma.order.findUnique({ where: { id: testOrderId } });
    expect(order?.status).toBe("shipped");
  });

  it("Delivery Confirmation: Confirming delivery marks order and shipment as delivered", async () => {
    // Set order to shipped with an active shipment
    const awbNumber = `BLRD-${Date.now()}`;
    await prisma.shipment.create({
      data: {
        id: randomUUID(),
        orderId: testOrderId,
        courier: "BlueDart",
        awb: awbNumber,
        status: "in_transit",
      },
    });
    await prisma.order.update({
      where: { id: testOrderId },
      data: { status: "shipped" },
    });

    const req = new Request("http://localhost/api/admin/operations", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        action: "confirm_delivery",
        orderId: testOrderId,
      }),
    });

    const res = await operationsHandler(req as any, {} as any);
    expect(res.status).toBe(200);

    const order = await prisma.order.findUnique({ where: { id: testOrderId } });
    expect(order?.status).toBe("delivered");

    const shipment = await prisma.shipment.findUnique({ where: { orderId: testOrderId } });
    expect(shipment?.status).toBe("delivered");
  });
});
