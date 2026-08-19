import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { CheckoutService } from "@/lib/services/checkout-service";
import { randomUUID } from "crypto";

describe("Gate 4: Price Snapshot & Server Authoritative Pricing Forensics", () => {
  let testProductId: string;
  const originalPriceCents = 29900; // ₹299
  const checkoutService = new CheckoutService();

  beforeEach(async () => {
    const product = await prisma.product.create({
      data: {
        id: randomUUID(),
        name: "Vintage Vinyl Sticker Pack",
        slug: `price-test-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        priceCents: originalPriceCents,
        stock: 50,
        type: "sticker",
      },
    });
    testProductId = product.id;
  });

  afterAll(async () => {
    try {
      await prisma.orderItem.deleteMany({ where: { productId: testProductId } });
      await prisma.inventoryReservation.deleteMany({ where: { productId: testProductId } });
      await prisma.inventoryLedgerEntry.deleteMany({ where: { productId: testProductId } });
      await prisma.product.deleteMany({ where: { id: testProductId } });
    } catch (e) {}
  });

  it("Historical Price Protection: OrderItem price snapshot is immutable when catalog price changes later", async () => {
    // 1. Customer buys 2 units at original ₹299 (29900 cents each)
    const result = await checkoutService.processCheckout({
      items: [
        {
          id: "item-1",
          productId: testProductId,
          name: "Vintage Vinyl Sticker Pack",
          price_cents: originalPriceCents,
          quantity: 2,
        },
      ],
      shippingAddress: {
        name: "Historical Customer",
        phone: "+919876543210",
        address: "123 MG Road, Bengaluru",
        pincode: "560001",
      },
      paymentMethod: "whatsapp",
    });

    expect(result.orderId).toBeDefined();

    // 2. Verify snapshot fields in OrderItem table
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId: result.orderId },
    });
    expect(orderItems.length).toBe(1);
    const item = orderItems[0];
    expect(item.unitPriceCents).toBe(originalPriceCents);
    expect(item.lineTotalCents).toBe(originalPriceCents * 2);

    // 3. Catalog price changes: Merchant increases price to ₹499 (49900 cents)
    await prisma.product.update({
      where: { id: testProductId },
      data: { priceCents: 49900 },
    });

    // 4. Invariant: Historical order item STILL retains ₹299 snapshot
    const reloadedItem = await prisma.orderItem.findUnique({
      where: { id: item.id },
    });
    expect(reloadedItem?.unitPriceCents).toBe(29900);
    expect(reloadedItem?.lineTotalCents).toBe(59800);

    const reloadedOrder = await prisma.order.findUnique({
      where: { id: result.orderId },
    });
    expect(reloadedOrder?.totalCents).toBe(result.totalCents);
  });

  it("Client Price Tampering Defeated: Server strictly computes authoritative catalog price", async () => {
    // Malicious customer submits ₹1 (100 cents) for a ₹299 item
    const tamperedPriceCents = 100;

    const result = await checkoutService.processCheckout({
      items: [
        {
          id: "item-tamper",
          productId: testProductId,
          name: "Vintage Vinyl Sticker Pack",
          price_cents: tamperedPriceCents, // Hacked client price
          quantity: 1,
        },
      ],
      shippingAddress: {
        name: "Adversarial Client",
        phone: "+919876543211",
        address: "404 Hacker Way",
        pincode: "560001",
      },
      paymentMethod: "whatsapp",
    });

    // Server-calculated total should use ₹299 catalog price + ₹49 shipping = ₹348 (34800 cents)
    expect(result.subtotalCents).toBe(originalPriceCents);
    expect(result.totalCents).toBe(originalPriceCents + 4900);

    // Database OrderItem must record server price, not tampered price
    const orderItem = await prisma.orderItem.findFirst({
      where: { orderId: result.orderId },
    });
    expect(orderItem?.unitPriceCents).toBe(originalPriceCents);
    expect(orderItem?.priceCents).toBe(originalPriceCents);
  });
});
