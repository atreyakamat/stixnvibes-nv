/**
 * Atomic Inventory Service — Phase 1 Transactional Correctness
 *
 * Provides SELECT FOR UPDATE based inventory reservation, release, and expiry.
 * Every stock mutation is recorded in the inventory ledger for auditability.
 */
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";

export interface ReservationResult {
  success: boolean;
  reservationId?: string;
  error?: string;
}

/**
 * Atomically reserve stock for a product. Uses SELECT FOR UPDATE to prevent
 * race conditions when two customers try to buy the last unit.
 *
 * @param productId - The product UUID
 * @param quantity - Number of units to reserve
 * @param orderId - The order this reservation belongs to (optional at cart stage)
 * @param expiresInMinutes - How long the reservation lasts before auto-expiry (default 30)
 */
export async function reserveStock(
  productId: string,
  quantity: number,
  orderId?: string,
  expiresInMinutes: number = 30
): Promise<ReservationResult> {
  if (quantity <= 0) {
    throw new ValidationError("Quantity must be positive");
  }

  return prisma.$transaction(
    async (tx) => {
      // 1. Lock the product row and read current stock
      const rows = await tx.$queryRaw<Array<{ id: string; stock: number }>>(
        Prisma.sql`SELECT id, stock FROM products WHERE id = ${productId}::uuid FOR UPDATE`
      );

      if (rows.length === 0) {
        throw new NotFoundError(`Product ${productId} not found`);
      }

      const currentStock = rows[0].stock;

      // 2. Check availability
      if (currentStock < quantity) {
        return {
          success: false,
          error: `Insufficient stock: ${currentStock} available, ${quantity} requested`,
        };
      }

      // 3. Decrement stock atomically
      await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      });

      // 4. Create reservation record (verify orderId existence if provided)
      let validOrderId: string | null = null;
      if (orderId) {
        const orderExists = await tx.order.findUnique({ where: { id: orderId }, select: { id: true } });
        if (orderExists) {
          validOrderId = orderId;
        }
      }

      const reservation = await tx.inventoryReservation.create({
        data: {
          productId,
          orderId: validOrderId,
          quantity,
          status: "active",
          expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000),
        },
      });

      // 5. Create ledger entry
      await tx.inventoryLedgerEntry.create({
        data: {
          productId,
          orderId: validOrderId,
          entryType: "reservation",
          quantity: -quantity,
          previousStock: currentStock,
          newStock: currentStock - quantity,
          reason: validOrderId
            ? `Stock reserved for order ${validOrderId}`
            : "Stock reserved at checkout",
          operator: "system",
        },
      });

      return { success: true, reservationId: reservation.id };
    },
    {
      timeout: 10000,
    }
  );
}

/**
 * Release a reservation and restore stock.
 * Used when an order is cancelled or a reservation expires.
 */
export async function releaseReservation(
  reservationId: string,
  reason: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const reservation = await tx.inventoryReservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation || reservation.status !== "active") {
      return; // Already released or not found — idempotent
    }

    // Restore stock
    await tx.product.update({
      where: { id: reservation.productId },
      data: { stock: { increment: reservation.quantity } },
    });

    // Mark reservation as released
    await tx.inventoryReservation.update({
      where: { id: reservationId },
      data: { status: "released", releasedAt: new Date() },
    });

    // Get updated stock for ledger
    const product = await tx.product.findUnique({
      where: { id: reservation.productId },
      select: { stock: true },
    });

    // Ledger entry
    await tx.inventoryLedgerEntry.create({
      data: {
        productId: reservation.productId,
        orderId: reservation.orderId,
        entryType: "release",
        quantity: reservation.quantity,
        previousStock: (product?.stock ?? 0) - reservation.quantity,
        newStock: product?.stock ?? 0,
        reason,
        operator: "system",
      },
    });
  });
}

/**
 * Commit a reservation — converts it from temporary to permanent.
 * Called when payment is confirmed.
 */
export async function commitReservation(orderId: string): Promise<void> {
  await prisma.inventoryReservation.updateMany({
    where: { orderId, status: "active" },
    data: { status: "committed" },
  });
}

/**
 * Expire all stale reservations and restore their stock.
 * Should be called periodically (every 5 minutes) via cron.
 * Returns the number of reservations expired.
 */
export async function expireStaleReservations(): Promise<number> {
  const expired = await prisma.inventoryReservation.findMany({
    where: {
      status: "active",
      expiresAt: { lt: new Date() },
    },
  });

  let count = 0;
  for (const reservation of expired) {
    try {
      await releaseReservation(
        reservation.id,
        "Reservation expired automatically"
      );
      count++;
    } catch (err) {
      console.error(
        `[inventory] Failed to expire reservation ${reservation.id}:`,
        err
      );
    }
  }

  return count;
}

/**
 * Release all active reservations for an order.
 * Used when an order is cancelled.
 */
export async function releaseOrderReservations(
  orderId: string,
  reason: string
): Promise<void> {
  const reservations = await prisma.inventoryReservation.findMany({
    where: { orderId, status: "active" },
  });

  for (const reservation of reservations) {
    await releaseReservation(reservation.id, reason);
  }
}
