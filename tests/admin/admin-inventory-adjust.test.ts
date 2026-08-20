import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as adjustInventoryHandler } from "@/app/api/admin/inventory/adjust/route";
import { randomUUID } from "crypto";

describe("Phase 4: Admin Audited Inventory Adjustment Tests", () => {
  let testProductId: string;
  const adminHeaders = {
    authorization: "Bearer snv_admin_token_static_dev",
    "content-type": "application/json",
  };

  beforeEach(async () => {
    testProductId = randomUUID();
    await prisma.product.create({
      data: {
        id: testProductId,
        name: "Adjustable Stock Product",
        slug: `adjust-prod-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        priceCents: 19900,
        stock: 50,
        type: "sticker",
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.inventoryLedgerEntry.deleteMany({ where: { productId: testProductId } });
      await prisma.product.deleteMany({ where: { id: testProductId } });
    } catch (e) {}
  });

  it("Manual Restock: Increases inventory and records audit ledger entry with operator & reason", async () => {
    const req = new Request("http://localhost/api/admin/inventory/adjust", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        productId: testProductId,
        adjustmentQuantity: 25,
        reason: "Received new supplier shipment batch #BLR-404",
        operator: "Warehouse Lead Priya",
      }),
    });

    const res = await adjustInventoryHandler(req as any, {} as any);
    expect(res.status).toBe(200);

    // Invariant 1: Product stock updated from 50 to 75
    const updated = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(updated?.stock).toBe(75);

    // Invariant 2: Inventory ledger entry recorded
    const ledger = await prisma.inventoryLedgerEntry.findMany({
      where: { productId: testProductId },
    });
    expect(ledger.length).toBe(1);
    expect(ledger[0].entryType).toBe("adjustment");
    expect(ledger[0].quantity).toBe(25);
    expect(ledger[0].previousStock).toBe(50);
    expect(ledger[0].newStock).toBe(75);
    expect(ledger[0].reason).toBe("Received new supplier shipment batch #BLR-404");
    expect(ledger[0].operator).toBe("Warehouse Lead Priya");
  });

  it("Manual Damaged Stock Write-off: Decreases inventory and logs write-off reason", async () => {
    const req = new Request("http://localhost/api/admin/inventory/adjust", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        productId: testProductId,
        adjustmentQuantity: -10,
        reason: "Water damage during transit",
        operator: "QC Lead Rahul",
      }),
    });

    const res = await adjustInventoryHandler(req as any, {} as any);
    expect(res.status).toBe(200);

    const updated = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(updated?.stock).toBe(40);

    const ledger = await prisma.inventoryLedgerEntry.findMany({
      where: { productId: testProductId },
    });
    expect(ledger.length).toBe(1);
    expect(ledger[0].quantity).toBe(-10);
    expect(ledger[0].newStock).toBe(40);
  });

  it("Oversell Rejection: Cannot reduce stock below 0", async () => {
    const req = new Request("http://localhost/api/admin/inventory/adjust", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        productId: testProductId,
        adjustmentQuantity: -100, // Stock is only 50
        reason: "Attempt to write off more than existing stock",
      }),
    });

    const res = await adjustInventoryHandler(req as any, {} as any);
    expect(res.status).toBe(400);

    // Stock remains intact
    const product = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(product?.stock).toBe(50);
  });
});
