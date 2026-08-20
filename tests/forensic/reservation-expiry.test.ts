import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  reserveStock,
  expireStaleReservations,
} from "@/lib/services/inventory-atomic.service";
import { randomUUID } from "crypto";

describe("Gate 3: Reservation Expiry & Auto-Restoration Invariants", { timeout: 15000 }, () => {
  let testProductId: string;

  beforeEach(async () => {
    const product = await prisma.product.create({
      data: {
        id: randomUUID(),
        name: `Expiry Test Product ${Date.now()}`,
        slug: `expiry-test-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        priceCents: 9900,
        stock: 5,
        type: "sticker",
      },
    });
    testProductId = product.id;
  });

  afterAll(async () => {
    try {
      await prisma.inventoryLedgerEntry.deleteMany({ where: { productId: testProductId } });
      await prisma.inventoryReservation.deleteMany({ where: { productId: testProductId } });
      await prisma.product.deleteMany({ where: { id: testProductId } });
    } catch (e) {}
  });

  it("should detect expired reservations, restore stock, and be idempotent across repeated runs", async () => {
    const orderId = randomUUID();

    // 1. Reserve 2 units (Stock becomes 3)
    const reserveRes = await reserveStock(testProductId, 2, orderId, 30);
    expect(reserveRes.success).toBe(true);

    const midProduct = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(midProduct?.stock).toBe(3);

    // 2. Manually backdate the reservation expiration timestamp to the past
    await prisma.inventoryReservation.update({
      where: { id: reserveRes.reservationId! },
      data: {
        expiresAt: new Date(Date.now() - 60 * 1000), // Expired 1 minute ago
      },
    });

    // 3. Execute expiry worker
    const expiredCount = await expireStaleReservations();
    expect(expiredCount).toBeGreaterThanOrEqual(1);

    // Invariant 1: Stock is restored from 3 back to 5
    const restoredProduct = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(restoredProduct?.stock).toBe(5);

    // Invariant 2: Reservation status is updated to released
    const reservation = await prisma.inventoryReservation.findUnique({
      where: { id: reserveRes.reservationId! },
    });
    expect(reservation?.status).toBe("released");

    // Invariant 3: Ledger records the expiry release
    const ledger = await prisma.inventoryLedgerEntry.findMany({
      where: { productId: testProductId },
      orderBy: { createdAt: "desc" },
    });
    expect(ledger[0].entryType).toBe("release");
    expect(ledger[0].quantity).toBe(2);
    expect(ledger[0].newStock).toBe(5);

    // Invariant 4: Running expiry worker a second time immediately is idempotent
    const secondPass = await expireStaleReservations();
    // The previously expired item is already released so count should not re-process it
    const finalProduct = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(finalProduct?.stock).toBe(5); // Stock does not double increment
  });
});
