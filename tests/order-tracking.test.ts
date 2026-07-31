import { describe, it, expect, vi } from "vitest";

function makeRequest(query: string) {
  return {
    method: "GET",
    nextUrl: {
      searchParams: {
        get: (key: string) => (key === "query" ? query : null),
      },
    },
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
  return { status: res.status, json: await res.json() };
}

describe("GET /api/orders/track", () => {
  it("does not fabricate demo tracking data for unknown queries", async () => {
    const result = await call("SAMPLE");
    expect(result.status).toBe(404);
    expect(result.json?.found).toBe(false);
    expect(result.json?.error).toContain("No order found");
  });
});
