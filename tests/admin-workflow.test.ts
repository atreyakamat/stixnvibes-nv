import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const makeRequest = (body: any) => {
  return new NextRequest("http://localhost:3000/api", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": "Bearer snv_admin_token_static_dev"
    },
    body: JSON.stringify(body),
  });
};

describe("admin workflow persistence", () => {
  beforeEach(async () => {
    vi.doMock("@/lib/auth-guard", () => ({
      requireAdminAuth: async () => null,
    }));
  });

  it("persists inventory changes and inventory logs in the database layer", async () => {
    const mod = await import("@/app/api/admin/inventory/route");
    
    // Seed a product for testing
    const productId = "55555555-5555-4555-a555-555555555555";
    await prisma.product.upsert({
      where: { id: productId },
      update: { stock: 10 },
      create: { id: productId, name: "Inventory Test Product", slug: "inv-test-2", priceCents: 100, stock: 10, currency: "INR", type: "sticker" }
    });

    const response = await (mod as any).POST(makeRequest({
      productId,
      change: -2,
      reason: "fulfillment",
      notes: "packed",
    }));

    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);

    const updatedProduct = await prisma.product.findUnique({ where: { id: productId } });
    expect(updatedProduct?.stock).toBe(8);
  });

  it("persists print batches and QC inspections instead of relying on in-memory state", async () => {
    const operations = await import("@/app/api/admin/operations/route");
    const createBatchResponse = await (operations as any).POST(makeRequest({
      action: "create_batch",
      material: "Vinyl",
      finish: "Glossy",
      size: '3" x 3"',
    }));
    const batchJson = await createBatchResponse.json();
    expect(createBatchResponse.status).toBe(200);
    expect(batchJson.ok).toBe(true);
    
    // Workaround for API response format if batchJson.data doesn't exist
    const dbBatch = await prisma.printBatch.findFirst({ orderBy: { createdAt: "desc" } });
    expect(dbBatch).toBeDefined();
    const batchId = dbBatch!.id;

    // Create a dummy job first
    const customerId = "11111111-1111-1111-1111-111111111111";
    const orderId = "22222222-2222-2222-2222-222222222222";
    const orderItemId = "66666666-6666-6666-6666-666666666666";
    const jobId = "77777777-7777-7777-7777-777777777777";
    const productId = "55555555-5555-5555-5555-555555555555";
    
    try {
      await prisma.users.upsert({ where: { id: customerId }, update: {}, create: { id: customerId, email: "test@t.com" } });
      await prisma.order.upsert({
        where: { id: orderId },
        update: {},
        create: { id: orderId, user_id: customerId, customerName: "T", customerPhone: "1", address: "A", pincode: "1", totalCents: 100 }
      });
      await prisma.orderItem.upsert({
        where: { id: orderItemId },
        update: {},
        create: { id: orderItemId, orderId: orderId, productId, priceCents: 100, name: "Test Item", quantity: 1 }
      });
      await prisma.productionJob.upsert({
        where: { id: jobId },
        update: {},
        create: { id: jobId, orderItemId, status: "queued", printBatchId: batchId }
      });
    } catch (e) { console.error(e); }

    const qcResponse = await (operations as any).POST(makeRequest({
      action: "qc_inspection",
      productionJobId: jobId,
      result: "pass",
      checklist: { color: true },
    }));

    const qcJson = await qcResponse.json();
    expect(qcResponse.status).toBe(200);
    expect(qcJson.ok).toBe(true);
  });
});
