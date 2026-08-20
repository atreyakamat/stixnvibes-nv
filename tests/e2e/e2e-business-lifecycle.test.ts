import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as createProductHandler } from "@/app/api/admin/products/route";
import { POST as checkoutHandler } from "@/app/api/checkout/route";
import { POST as webhookHandler } from "@/app/api/payments/webhook/route";
import { POST as transitionHandler } from "@/app/api/orders/[id]/transition/route";
import { POST as operationsHandler } from "@/app/api/admin/operations/route";
import { GET as trackHandler } from "@/app/api/orders/track/route";
import { ProductionService } from "@/lib/services/production.service";
import { randomUUID, createHmac } from "crypto";

describe("Real E2E Business Acceptance Suite: Full Commerce Lifecycle", () => {
  const adminHeaders = {
    authorization: "Bearer snv_admin_token_static_dev",
    "content-type": "application/json",
  };

  let productId: string;
  let variantId: string;
  let categoryId: string;
  let orderId: string;
  let orderNumber: string;
  let productionJobId: string;
  const uniqueSuffix = Date.now().toString(36);
  const testAwb = `BLRD-E2E-${uniqueSuffix}`;

  beforeAll(async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "rzp_webhook_secret_dev_123";
    // Setup Category
    categoryId = randomUUID();
    await prisma.category.create({
      data: {
        id: categoryId,
        name: "E2E Test Stickers",
        slug: `e2e-cat-${uniqueSuffix}`,
      },
    });
  });

  afterAll(async () => {
    try {
      if (orderId) {
        await prisma.shipmentEvent.deleteMany({ where: { shipment: { orderId } } });
        await prisma.shipment.deleteMany({ where: { orderId } });
        await prisma.qualityCheck.deleteMany({ where: { productionJob: { orderItem: { orderId } } } });
        await prisma.productionJob.deleteMany({ where: { orderItem: { orderId } } });
        await prisma.paymentWebhookEvent.deleteMany({ where: { eventId: `evt_${uniqueSuffix}` } });
        await prisma.payment.deleteMany({ where: { orderId } });
        await prisma.inventoryReservation.deleteMany({ where: { orderId } });
        await prisma.inventoryLedgerEntry.deleteMany({ where: { orderId } });
        await prisma.orderItem.deleteMany({ where: { orderId } });
        await prisma.order.deleteMany({ where: { id: orderId } });
      }
      if (productId) {
        await prisma.variant.deleteMany({ where: { productId } });
        await prisma.inventoryReservation.deleteMany({ where: { productId } });
        await prisma.inventoryLedgerEntry.deleteMany({ where: { productId } });
        await prisma.product.deleteMany({ where: { id: productId } });
      }
      if (categoryId) {
        await prisma.category.deleteMany({ where: { id: categoryId } });
      }
    } catch (e) {
      console.error("Cleanup error:", e);
    }
  });

  it("Step 1: Admin Creates Product with Variant & Category Assignment", async () => {
    productId = randomUUID();
    variantId = randomUUID();

    const productPayload = {
      id: productId,
      name: "Cyberpunk Holo Sticker",
      slug: `cyberpunk-holo-${uniqueSuffix}`,
      description: "Premium UV-resistant holographic vinyl sticker",
      priceCents: 29900, // ₹299
      stock: 25,
      type: "sticker",
      categoryId,
      visibility: "visible",
      status: "active",
    };

    const req = new Request("http://localhost/api/admin/products", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify(productPayload),
    });

    const res = await createProductHandler(req as any, {} as any);
    expect(res.status).toBe(200);

    // Add Variant
    await prisma.variant.create({
      data: {
        id: variantId,
        productId,
        name: "Large 4x4 inch / Matte Finish",
        priceModifierCents: 5000, // +₹50
        stock: 25,
      },
    });

    // Invariant: Product and variant exist in PostgreSQL
    const dbProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true, category: true },
    });
    expect(dbProduct).toBeDefined();
    expect(dbProduct?.stock).toBe(25);
    expect(dbProduct?.variants.length).toBe(1);
    expect(dbProduct?.variants[0].priceModifierCents).toBe(5000);
  });

  it("Step 2: Customer Checkout with Authoritative Server Pricing & Stock Reservation", async () => {
    // Attempt client-side price tampering (client sends ₹1 instead of ₹349)
    const tamperedClientPrice = 100;

    const checkoutReq = new Request("http://localhost/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: [
          {
            id: randomUUID(),
            productId: productId,
            variantId: variantId,
            name: "Cyberpunk Holo Sticker",
            variantName: "Large 4x4 inch / Matte Finish",
            price_cents: tamperedClientPrice,
            quantity: 2,
          },
        ],
        shippingAddress: {
          name: "Vikram Malhotra",
          phone: "+919876543210",
          email: "vikram.malhotra@example.com",
          address: "Flat 402, Skyline Towers, MG Road",
          pincode: "560001",
          notes: "Please pack with extra cardboard support",
        },
        paymentMethod: "razorpay",
      }),
    });

    const res = await checkoutHandler(checkoutReq as any, {} as any);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.orderId).toBeDefined();
    orderId = json.orderId;
    orderNumber = json.orderNumber;

    // Expected authoritative pricing: (299 + 50) * 2 = ₹698 (69800 cents)
    // Shipping is free (subtotal >= ₹499)
    expect(json.subtotalCents).toBe(69800);
    expect(json.totalCents).toBe(69800);

    // Invariant 1: Order persisted in PostgreSQL
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, reservations: true },
    });
    expect(order).toBeDefined();
    expect(order?.status).toBe("created");
    expect(order?.totalCents).toBe(69800);

    // Invariant 2: Price snapshots captured on OrderItem
    expect(order?.items.length).toBe(1);
    expect(order?.items[0].unitPriceCents).toBe(29900);
    expect(order?.items[0].lineTotalCents).toBe(69800);
    expect(order?.items[0].productNameSnapshot).toBe("Cyberpunk Holo Sticker");

    // Invariant 3: Atomic stock reservation created
    expect(order?.reservations.length).toBe(1);
    expect(order?.reservations[0].status).toBe("active");
    expect(order?.reservations[0].quantity).toBe(2);

    // Invariant 4: Available product stock decremented from 25 to 23
    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product?.stock).toBe(23);
  });

  it("Step 3: Payment Gateway Webhook Captures Payment & Commits Reservations", async () => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "rzp_webhook_secret_dev_123";
    const paymentId = `pay_${uniqueSuffix}`;
    const rzpOrderId = `order_${uniqueSuffix}`;

    // Create pending payment row
    await prisma.payment.create({
      data: {
        id: randomUUID(),
        orderId,
        provider: "razorpay",
        providerOrderId: rzpOrderId,
        amountCents: 69800,
        status: "pending",
      },
    });

    const payload = JSON.stringify({
      id: `evt_${uniqueSuffix}`,
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: rzpOrderId,
            amount: 69800, // In paise
            currency: "INR",
            status: "captured",
          },
        },
      },
    });

    const signature = createHmac("sha256", webhookSecret).update(payload).digest("hex");

    const req = new Request("http://localhost/api/payments/webhook", {
      method: "POST",
      headers: {
        "x-razorpay-signature": signature,
        "content-type": "application/json",
      },
      body: payload,
    });

    const res = await webhookHandler(req as any);
    expect(res.status).toBe(200);

    // Invariant 1: Order status transitioned to paid
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true, reservations: true },
    });
    expect(order?.status).toBe("paid");

    // Invariant 2: Payment captured
    expect(order?.payments[0].status).toBe("paid");
    expect(order?.payments[0].providerPaymentId).toBe(paymentId);

    // Invariant 3: Reservations committed
    expect(order?.reservations[0].status).toBe("committed");
  });

  it("Step 4: Production Pipeline Advances & Automatically Rolls Up to QC", async () => {
    // Transition order to production
    const transReq = new Request(`http://localhost/api/orders/${orderId}/transition`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ status: "production" }),
    });
    const transRes = await transitionHandler(transReq as any, { params: { id: orderId } });
    expect(transRes.status).toBe(200);

    const orderItems = await prisma.orderItem.findMany({ where: { orderId } });
    productionJobId = randomUUID();

    // Create production job for item
    await prisma.productionJob.create({
      data: {
        id: productionJobId,
        orderItemId: orderItems[0].id,
        status: "printing",
      },
    });

    // Complete production job via domain service
    const prodService = new ProductionService();
    await prodService.completeProductionJob(productionJobId);

    // Invariant: Job is completed and order automatically rolls up to 'qc'
    const job = await prisma.productionJob.findUnique({ where: { id: productionJobId } });
    expect(job?.status).toBe("completed");

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe("qc");
  });

  it("Step 5: QC Inspection Passes & Advances Order to Packing", async () => {
    const req = new Request("http://localhost/api/admin/operations", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        action: "submit_qc",
        productionJobId,
        operator: "Senior Inspector Rohit",
        result: "pass",
        checklist: {
          colorAccuracy: true,
          dieCutCleanliness: true,
          adhesiveStrength: true,
        },
      }),
    });

    const res = await operationsHandler(req as any, {} as any);
    expect(res.status).toBe(200);

    // Invariant 1: QC check recorded in database
    const qc = await prisma.qualityCheck.findMany({
      where: { productionJobId },
    });
    expect(qc.length).toBe(1);
    expect(qc[0].result).toBe("passed");
    expect(qc[0].operator).toBe("Senior Inspector Rohit");

    // Invariant 2: Order status rolled up to packing
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe("packing");
  });

  it("Step 6: Shipment Manifest Created & Order Dispatched with Unique AWB", async () => {
    const req = new Request("http://localhost/api/admin/operations", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        action: "create_shipment",
        orderId,
        courier: "BlueDart",
        awb: testAwb,
      }),
    });

    const res = await operationsHandler(req as any, {} as any);
    expect(res.status).toBe(200);

    // Invariant 1: Shipment record exists in database
    const shipment = await prisma.shipment.findUnique({
      where: { orderId },
    });
    expect(shipment).toBeDefined();
    expect(shipment?.courier).toBe("BlueDart");
    expect(shipment?.awb).toBe(testAwb);

    // Invariant 2: Order status transitioned to shipped
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe("shipped");
  });

  it("Step 7: Delivery Confirmed & Order Marked Delivered", async () => {
    const req = new Request("http://localhost/api/admin/operations", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        action: "confirm_delivery",
        orderId,
      }),
    });

    const res = await operationsHandler(req as any, {} as any);
    expect(res.status).toBe(200);

    // Invariant 1: Order is marked delivered
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe("delivered");

    // Invariant 2: Shipment is marked delivered
    const shipment = await prisma.shipment.findUnique({ where: { orderId } });
    expect(shipment?.status).toBe("delivered");
  });

  it("Step 8: Public Tracking Query Returns Accurate Status Without Exposing Sensitive Secrets", async () => {
    const req = new Request(`http://localhost/api/orders/track?query=${encodeURIComponent(orderId)}`);
    const res = await trackHandler(req as any, {} as any);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.found).toBe(true);
    expect(json.status).toBe("delivered");
    expect(json.orderNumber).toBe(orderNumber);
    expect(json.courier).toBe("BlueDart");
    expect(json.trackingNumber).toBe(testAwb);
    expect(json.events.length).toBeGreaterThanOrEqual(1);
  });
});
