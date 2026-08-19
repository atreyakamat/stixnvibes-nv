import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  reserveStock,
  releaseReservation,
  commitReservation,
  releaseOrderReservations,
} from "@/lib/services/inventory-atomic.service";
import { randomUUID } from "crypto";

describe("Gate 2: Inventory Concurrency & Race Condition Proof (Real Postgres DB)", () => {
  let testProductId: string;

  beforeEach(async () => {
    // Create a dedicated clean product in PostgreSQL for each test
    const product = await prisma.product.create({
      data: {
        id: randomUUID(),
        name: `Concurrency Test Product ${Date.now()}`,
        slug: `concurrency-test-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        priceCents: 19900,
        stock: 1, // Default 1 for binary race test
        type: "sticker",
      },
    });
    testProductId = product.id;
  });

  afterAll(async () => {
    // Cleanup any remaining test entities
    try {
      await prisma.inventoryLedgerEntry.deleteMany({
        where: { productId: testProductId },
      });
      await prisma.inventoryReservation.deleteMany({
        where: { productId: testProductId },
      });
      await prisma.product.deleteMany({
        where: { id: testProductId },
      });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  it("Binary Race: Two concurrent customers attempt to reserve the final 1 unit — EXACTLY ONE SUCCEEDS", async () => {
    const orderA = randomUUID();
    const orderB = randomUUID();

    // Fire 2 concurrent reservation requests simultaneously against stock = 1
    const [resultA, resultB] = await Promise.all([
      reserveStock(testProductId, 1, orderA, 30),
      reserveStock(testProductId, 1, orderB, 30),
    ]);

    // Invariant 1: Exactly one must succeed, exactly one must fail
    const successCount = [resultA, resultB].filter((r) => r.success).length;
    const failureCount = [resultA, resultB].filter((r) => !r.success).length;

    expect(successCount).toBe(1);
    expect(failureCount).toBe(1);

    // Invariant 2: Database stock must be exactly 0 (no oversell, non-negative)
    const dbProduct = await prisma.product.findUnique({
      where: { id: testProductId },
    });
    expect(dbProduct?.stock).toBe(0);

    // Invariant 3: Exactly 1 active reservation in the database
    const activeReservations = await prisma.inventoryReservation.findMany({
      where: { productId: testProductId, status: "active" },
    });
    expect(activeReservations.length).toBe(1);
    expect(activeReservations[0].quantity).toBe(1);

    // Invariant 4: Inventory ledger records the exact reservation
    const ledgerEntries = await prisma.inventoryLedgerEntry.findMany({
      where: { productId: testProductId },
    });
    expect(ledgerEntries.length).toBe(1);
    expect(ledgerEntries[0].entryType).toBe("reservation");
    expect(ledgerEntries[0].quantity).toBe(-1);
    expect(ledgerEntries[0].previousStock).toBe(1);
    expect(ledgerEntries[0].newStock).toBe(0);
  });

  it("High Concurrency: 100 concurrent customers compete for 10 units — MAXIMUM 10 SUCCEED, STOCK NEVER NEGATIVE", async () => {
    // Set stock to 10
    await prisma.product.update({
      where: { id: testProductId },
      data: { stock: 10 },
    });

    // 100 buyers simultaneously requesting 1 unit each
    const buyerCount = 100;
    const promises = Array.from({ length: buyerCount }, (_, i) =>
      reserveStock(testProductId, 1, randomUUID(), 30)
    );

    const results = await Promise.all(promises);

    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);

    // Invariant 1: Exactly 10 successful reservations
    expect(successes.length).toBe(10);
    // Invariant 2: Exactly 90 failed reservations
    expect(failures.length).toBe(90);

    // Invariant 3: Final database stock is exactly 0 (never negative)
    const finalProduct = await prisma.product.findUnique({
      where: { id: testProductId },
    });
    expect(finalProduct?.stock).toBe(0);

    // Invariant 4: Exactly 10 active reservations
    const reservations = await prisma.inventoryReservation.findMany({
      where: { productId: testProductId, status: "active" },
    });
    expect(reservations.length).toBe(10);

    // Invariant 5: Ledger has 10 reservation entries totaling -10
    const ledger = await prisma.inventoryLedgerEntry.findMany({
      where: { productId: testProductId, entryType: "reservation" },
    });
    expect(ledger.length).toBe(10);
    const totalDeducted = ledger.reduce((sum, e) => sum + e.quantity, 0);
    expect(totalDeducted).toBe(-10);
  });

  it("Cancellation & Release: Cancelling an order restores inventory and updates ledger exactly once", async () => {
    const orderId = randomUUID();
    await prisma.order.create({
      data: {
        id: orderId,
        customerName: "Cancellation Test Customer",
        customerPhone: "+919876543210",
        address: "123 Cancel Ave",
        pincode: "560001",
        totalCents: 19900,
        status: "confirmed",
      },
    });

    const res = await reserveStock(testProductId, 1, orderId, 30);
    expect(res.success).toBe(true);

    // Initial stock was 1, after reserve stock is 0
    const postReserve = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(postReserve?.stock).toBe(0);

    // Release the reservation
    await releaseOrderReservations(orderId, "Customer requested cancellation");

    // Invariant 1: Stock is restored to 1
    const postRelease = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(postRelease?.stock).toBe(1);

    // Invariant 2: Reservation is marked released
    const reservation = await prisma.inventoryReservation.findUnique({
      where: { id: res.reservationId! },
    });
    expect(reservation?.status).toBe("released");
    expect(reservation?.releasedAt).toBeInstanceOf(Date);

    // Invariant 3: Ledger contains release record with increment
    const ledger = await prisma.inventoryLedgerEntry.findMany({
      where: { productId: testProductId },
      orderBy: { createdAt: "asc" },
    });
    expect(ledger.length).toBe(2);
    expect(ledger[1].entryType).toBe("release");
    expect(ledger[1].quantity).toBe(1);
    expect(ledger[1].previousStock).toBe(0);
    expect(ledger[1].newStock).toBe(1);

    // Invariant 4: Calling release again is idempotent (does not double-restore stock)
    await releaseOrderReservations(orderId, "Duplicate release call");
    const postDuplicate = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(postDuplicate?.stock).toBe(1); // Stock remains 1
  });
});
