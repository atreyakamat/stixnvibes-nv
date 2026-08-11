import { describe, it, expect, vi } from "vitest";

function makeRequest(query: string) {
  return {
    method: "GET",
    nextUrl: new URL(`http://localhost/api/orders/track?query=${query}`),
    url: `http://localhost/api/orders/track?query=${query}`,
  } as any;
}

async function call(query: string) {
  vi.resetModules();
  vi.doMock("@/lib/supabase/service", () => ({
    createService: () => null,
    isServiceConfigured: () => false,
  }));

  const mod = await import("@/app/api/orders/track/route");
  const req = makeRequest(query);
  const res = await (mod as any).GET(req);
  const json = await res.json();
  if (res.status === 500) {
    console.error("Order tracking returned 500:", json);
  }
  return { status: res.status, json };
}

describe("GET /api/orders/track", () => {
  it("does not fabricate demo tracking data for unknown queries", async () => {
    const result = await call("SAMPLE");
    expect(result.status).toBe(404);
    expect(result.json?.found).toBe(false);
    expect(result.json?.error).toContain("No order found");
  });
});
