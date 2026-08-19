import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { OrderService } from "@/lib/services/order-service";
import { ProductionService } from "@/lib/services/production.service";
import { QcService } from "@/lib/services/qc.service";
import { ShippingService } from "@/lib/services/shipping.service";
import { ValidationError, ConflictError } from "@/lib/errors";
import { randomUUID } from "crypto";

describe("Gate 8–11: Phase 3 Operational Workflow Invariant Tests", () => {
  const orderService = new OrderService();
  const productionService = new ProductionService();
  const qcService = new QcService();
  const shippingService = new ShippingService();

  let testOrderId: string;
  let testOrderItemId: string;
  let testJobId: string;

  beforeEach(async () => {
    testOrderId = randomUUID();
    testOrderItemId = randomUUID();
    testJobId = randomUUID();

    // Create an order in PAID status
    await prisma.order.create({
      data: {
        id: testOrderId,
        customerName: "Workflow Test Customer",
        customerPhone: "+919876543210",
        address: "Industrial Area, Bengaluru",
        pincode: "560058",
        totalCents: 59900,
        status: "paid",
      },
    });

    // Create order item
    await prisma.orderItem.create({
      data: {
        id: testOrderItemId,
        orderId: testOrderId,
        name: "Custom Vinyl Decal",
        quantity: 1,
        priceCents: 59900,
      },
    });

    // Create production job for this item
    await prisma.productionJob.create({
      data: {
        id: testJobId,
        orderItemId: testOrderItemId,
        status: "in_progress",
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.qualityCheck.deleteMany({});
      await prisma.shipment.deleteMany({ where: { orderId: testOrderId } });
      await prisma.productionJob.deleteMany({ where: { orderItemId: testOrderItemId } });
      await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.deleteMany({ where: { id: testOrderId } });
    } catch (e) {}
  });

  it("Production Pipeline: completeProductionJob transitions job to completed and order to qc", async () => {
    // 1. Order is paid -> transition to production
    await orderService.updateOrderStatus(testOrderId, "production");
    const orderInProd = await prisma.order.findUnique({ where: { id: testOrderId } });
    expect(orderInProd?.status).toBe("production");

    // 2. Complete the production job
    const completedJob = await productionService.completeProductionJob(testJobId);
    expect(completedJob.status).toBe("completed");

    // Invariant: Order automatically rolls up to 'qc' status
    const orderInQc = await prisma.order.findUnique({ where: { id: testOrderId } });
    expect(orderInQc?.status).toBe("qc");

    // Idempotent: Calling complete again is safe
    const reComplete = await productionService.completeProductionJob(testJobId);
    expect(reComplete.status).toBe("completed");
  });

  it("QC Inspection Success: Passing QC transitions order to packing", async () => {
    // Put order in QC
    await prisma.order.update({ where: { id: testOrderId }, data: { status: "qc" } });

    // Record passed QC
    const qc = await qcService.recordQcResult(testJobId, "inspector_alice", "passed");
    expect(qc.result).toBe("passed");

    // Invariant: Order rolls up to 'packing' status
    const orderInPacking = await prisma.order.findUnique({ where: { id: testOrderId } });
    expect(orderInPacking?.status).toBe("packing");
  });

  it("QC Inspection Failure & Rework: Failing QC transitions to qc_failed and allows rework back to production", async () => {
    await prisma.order.update({ where: { id: testOrderId }, data: { status: "qc" } });

    // Record failed QC
    const qc = await qcService.recordQcResult(
      testJobId,
      "inspector_bob",
      "failed",
      "Print alignment misaligned by 3mm"
    );
    expect(qc.result).toBe("failed");
    expect(qc.failureReason).toBe("Print alignment misaligned by 3mm");

    // Invariant 1: Order becomes qc_failed
    const orderFailed = await prisma.order.findUnique({ where: { id: testOrderId } });
    expect(orderFailed?.status).toBe("qc_failed");

    // Invariant 2: Cannot transition directly from qc_failed to packing
    expect(() => orderService.updateOrderStatus(testOrderId, "packing")).rejects.toThrow();

    // Invariant 3: Rework path allowed: qc_failed -> production
    await orderService.updateOrderStatus(testOrderId, "production");
    const reworkedOrder = await prisma.order.findUnique({ where: { id: testOrderId } });
    expect(reworkedOrder?.status).toBe("production");
  });

  it("Shipping Flow: createShipment validates packing state, prevents duplicate AWB/shipment, and confirms delivery", async () => {
    // 1. Order in 'paid' status attempting to ship must fail
    await expect(
      shippingService.createShipment(testOrderId, "BlueDart", "AWB-11223344")
    ).rejects.toThrow(ValidationError);

    // 2. Put order into 'packing' status
    await prisma.order.update({ where: { id: testOrderId }, data: { status: "packing" } });

    // 3. Create valid shipment
    const shipment = await shippingService.createShipment(testOrderId, "BlueDart", "AWB-11223344");
    expect(shipment.courier).toBe("BlueDart");
    expect(shipment.awb).toBe("AWB-11223344");
    expect(shipment.status).toBe("manifested");

    // Invariant 1: Order transitioned to shipped
    const shippedOrder = await prisma.order.findUnique({ where: { id: testOrderId } });
    expect(shippedOrder?.status).toBe("shipped");

    // Invariant 2: Duplicate shipment creation for the same order is strictly rejected
    await expect(
      shippingService.createShipment(testOrderId, "Delhivery", "AWB-99887766")
    ).rejects.toThrow(ConflictError);

    // 4. Confirm delivery
    const deliveredOrder = await shippingService.confirmDelivery(testOrderId);
    expect(deliveredOrder.status).toBe("delivered");

    const deliveredShipment = await prisma.shipment.findUnique({ where: { orderId: testOrderId } });
    expect(deliveredShipment?.status).toBe("delivered");
  });
});
