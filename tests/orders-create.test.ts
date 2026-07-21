/**
 * Integration test for /api/orders/create route — exercises the validation,
 * WhatsApp URL generation, and "graceful degradation" behaviour when Supabase
 * isn't wired.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Stub fetch + a minimal NextRequest mock so we can call the route handler.
function makeRequest(body: unknown) {
  return {
    method: "POST",
    json: async () => body,
    headers: new Headers(),
    cookies: { getAll: () => [] },
  } as any;
}

let response: any;

function capture() {
  return response;
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "919999999999";
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
});

async function call(body: any) {
  vi.resetModules();
  // Stub a no-op createService so we never hit Supabase in tests.
  vi.doMock("@/lib/supabase/service", () => ({
    createService: () => null,
    isServiceConfigured: () => false,
  }));
  vi.doMock("@/lib/supabase/client", () => ({
    createBrowser: () => null,
    isSupabaseConfigured: () => false,
  }));

  const mod = await import("@/app/api/orders/create/route");
  const req = makeRequest(body);
  const res = (await (mod as any).POST(req)) as any;
  if (res && typeof res.json === "function") {
    return { status: res.status, json: await res.json() };
  }
  return { status: res?.status ?? 0, json: null };
}

describe("POST /api/orders/create", () => {
  it("rejects an empty body", async () => {
    const r = await call(null);
    expect(r.status).toBe(400);
    expect(r.json?.error).toMatch(/Invalid/i);
  });

  it("rejects an invalid phone number", async () => {
    const r = await call({
      customer_name: "Aarav",
      customer_phone: "abc",
      address: "Somewhere",
      pincode: "560001",
      items: [{ name: "P", price_cents: 100, quantity: 1 }],
    });
    expect(r.status).toBe(400);
  });

  it("rejects an invalid pincode", async () => {
    const r = await call({
      customer_name: "Aarav",
      customer_phone: "+919999999999",
      address: "Somewhere",
      pincode: "x".repeat(20),
      items: [{ name: "P", price_cents: 100, quantity: 1 }],
    });
    expect(r.status).toBe(400);
  });

  it("rejects an empty items list", async () => {
    const r = await call({
      customer_name: "Aarav",
      customer_phone: "+919999999999",
      address: "Somewhere",
      pincode: "560001",
      items: [],
    });
    expect(r.status).toBe(400);
  });

  it("accepts valid orders and returns a wa.me url", async () => {
    const r = await call({
      customer_name: "Aarav",
      customer_phone: "+919999999999",
      address: "12 MG Road, Bengaluru",
      pincode: "560001",
      items: [
        { product_id: "s1", variant_id: "v1", name: "Anime Pack", price_cents: 29900, quantity: 2, variant_name: "Standard" },
      ],
      notes: "Gift wrap",
    });
    expect(r.status).toBe(200);
    expect(r.json?.ok).toBe(true);
    expect(r.json?.whatsappUrl).toContain("https://wa.me/919999999999");
    const decoded = decodeURIComponent((r.json?.whatsappUrl as string).split("text=")[1]);
    expect(decoded).toContain("Anime Pack");
    expect(decoded).toContain("×2");
    expect(decoded).toContain("₹598");
    expect(r.json?.persisted).toBe(false);
  });
});
