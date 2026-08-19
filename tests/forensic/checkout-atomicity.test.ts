import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { CheckoutService } from "@/lib/services/checkout-service";
import { ValidationError } from "@/lib/errors";
import { randomUUID } from "crypto";

describe("Gate 5: Checkout Transaction Atomicity & Rollback Guarantees", () => {
  let testProductId: string;
  const checkoutService = new CheckoutService();

  beforeEach(async () => {
    const product = await prisma.product.create({
      data: {
        id: randomUUID(),
        name: "Atomicity Verification Item",
        slug: `atomicity-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        priceCents: 15000,
        stock: 2, // Only 2 in stock
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

  it("Rollback on Insufficient Stock: Zero partial orders or corrupted reservations remain", async () => {
    const initialOrderCount = await prisma.order.count();

    // Customer requests 5 units when only 2 are available
    await expect(
      checkoutService.processCheckout({
        items: [
          {
            id: "atomic-1",
            productId: testProductId,
            name: "Atomicity Verification Item",
            price_cents: 15000,
            quantity: 5, // Exceeds stock (2)
          },
        ],
        shippingAddress: {
          name: "Oversell Attempt",
          phone: "+919876543210",
          address: "No Way St",
          pincode: "560001",
        },
        paymentMethod: "whatsapp",
      })
    ).rejects.toThrow(/Insufficient stock/);

    // Invariant 1: No order created with this specific customer name
    const orderCreated = await prisma.order.findFirst({
      where: { customerName: "Oversell Attempt" },
    });
    expect(orderCreated).toBeNull();

    // Invariant 2: Stock remains intact at 2
    const product = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(product?.stock).toBe(2);

    // Invariant 3: No orphaned active reservations
    const reservations = await prisma.inventoryReservation.findMany({
      where: { productId: testProductId, status: "active" },
    });
    expect(reservations.length).toBe(0);
  });

  it("Rollback on Validation Error: Invalid Indian PIN code rejects before creating database records", async () => {
    const initialOrderCount = await prisma.order.count();

    await expect(
      checkoutService.processCheckout({
        items: [
          {
            id: "atomic-2",
            productId: testProductId,
            name: "Atomicity Verification Item",
            price_cents: 15000,
            quantity: 1,
          },
        ],
        shippingAddress: {
          name: "Bad Pincode User",
          phone: "+919876543210",
          address: "Valid Address",
          pincode: "123", // INVALID PINCODE (must be 6 digits)
        },
        paymentMethod: "whatsapp",
      })
    ).rejects.toThrow(ValidationError);

    // Invariant: No order created with this specific customer name
    const orderCreated = await prisma.order.findFirst({
      where: { customerName: "Bad Pincode User" },
    });
    expect(orderCreated).toBeNull();

    // Invariant: Stock unchanged
    const product = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(product?.stock).toBe(2);
  });
});
