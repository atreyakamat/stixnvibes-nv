import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

function makeRequest(body: unknown) {
  return {
    method: "POST",
    json: async () => body,
    headers: new Headers(),
    cookies: { getAll: () => [] },
  } as any;
}

function makeRequestGet() {
  return {
    method: "GET",
    url: "http://localhost/api/admin/operations?mode=batches",
    headers: new Headers(),
    cookies: { getAll: () => [] },
  } as any;
}

describe("admin workflow persistence", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("persists inventory changes and inventory logs in the database layer", async () => {
    const state = {
      products: [{ id: "prod-1", name: "Sticker", stock: 5 }],
      inventoryLogs: [] as any[],
    };

    const fakeClient = {
      from(table: string) {
        if (table === "products") {
          return {
            select() {
              return {
                eq(_field: string, value: string) {
                  return {
                    single: async () => ({
                      data: state.products.find((product) => product.id === value) ?? null,
                      error: null,
                    }),
                  };
                },
              };
            },
            update(payload: any) {
              return {
                eq(_field: string, value: string) {
                  const product = state.products.find((entry) => entry.id === value);
                  if (product) product.stock = payload.stock;
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        }

        if (table === "inventory_logs") {
          return {
            insert(payload: any) {
              state.inventoryLogs.push(payload);
              return {
                select: () => ({
                  single: async () => ({ data: payload, error: null }),
                }),
              };
            },
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    };

    vi.doMock("@/lib/supabase/service", () => ({
      createService: () => fakeClient,
      isServiceConfigured: () => true,
    }));
    vi.doMock("@/lib/auth-guard", () => ({
      requireAdminAuth: async () => null,
    }));

    const mod = await import("@/app/api/admin/inventory/route");
    const response = await (mod as any).POST(makeRequest({
      productId: "prod-1",
      change: -2,
      reason: "fulfillment",
      notes: "packed",
    }));

    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(state.products[0].stock).toBe(3);
    expect(state.inventoryLogs).toHaveLength(1);
    expect(state.inventoryLogs[0]).toEqual(expect.objectContaining({
      product_id: "prod-1",
      change: -2,
      reason: "fulfillment",
      new_stock: 3,
    }));
  });

  it("persists print batches and QC inspections instead of relying on in-memory state", async () => {
    const state = {
      printBatches: [] as any[],
      qualityChecks: [] as any[],
    };

    const fakeClient = {
      from(table: string) {
        if (table === "print_batches") {
          return {
            insert(payload: any) {
              state.printBatches.push(payload);
              return {
                select: () => ({
                  single: async () => ({ data: payload, error: null }),
                }),
              };
            },
            select() {
              return {
                order() {
                  return {
                    data: state.printBatches,
                    error: null,
                  };
                },
              };
            },
          };
        }

        if (table === "quality_checks") {
          return {
            insert(payload: any) {
              state.qualityChecks.push(payload);
              return Promise.resolve({ data: payload, error: null });
            },
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    };

    vi.doMock("@/lib/supabase/service", () => ({
      createService: () => fakeClient,
      isServiceConfigured: () => true,
    }));
    vi.doMock("@/lib/auth-guard", () => ({
      requireAdminAuth: async () => null,
    }));

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
    expect(state.printBatches).toHaveLength(1);

    const qcResponse = await (operations as any).POST(makeRequest({
      action: "qc_inspection",
      orderId: "order-123",
      result: "pass",
      checklist: { color: true },
    }));
    const qcJson = await qcResponse.json();
    expect(qcResponse.status).toBe(200);
    expect(qcJson.ok).toBe(true);
    expect(state.qualityChecks).toHaveLength(1);
    expect(state.qualityChecks[0]).toEqual(expect.objectContaining({
      order_id: "order-123",
      result: "pass",
      checklist: { color: true },
    }));
  });
});
