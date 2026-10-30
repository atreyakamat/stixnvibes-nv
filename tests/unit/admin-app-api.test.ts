import { beforeAll, describe, expect, it, vi } from "vitest";

// The admin app's API, end to end over the in-memory demo store.

vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: async () => new Headers({ "x-forwarded-for": "10.0.0.1" }) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

type Api = typeof import("@/lib/admin/app-api");
let api: Api;
let token = "";

const call = async (method: string, path: string, body?: unknown, auth = token) => {
  const res = await api.handle(
    new Request(`http://shop.test/api/app/admin/${path}`, {
      method,
      headers: { "content-type": "application/json", ...(auth ? { authorization: `Bearer ${auth}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    path.split("?")[0].split("/"),
  );
  return { status: res.status, data: await res.json() };
};

beforeAll(async () => {
  vi.stubEnv("SHOP_DEMO_MODE", "true");
  api = await import("@/lib/admin/app-api");
  const { status, data } = await call("POST", "login", { email: "demo@stixnvibes.com", password: "demo-admin" }, "");
  expect(status).toBe(200);
  token = data.token;
});

describe("admin app API auth", () => {
  it("rejects a wrong password and requests without a token", async () => {
    expect((await call("POST", "login", { email: "demo@stixnvibes.com", password: "nope" }, "")).status).toBe(401);
    expect((await call("GET", "me", undefined, "")).status).toBe(401);
    expect((await call("GET", "me", undefined, "garbage.token")).status).toBe(401);
  });

  it("doesn't accept a web admin cookie value as an app token", async () => {
    const { encodeSession } = await import("@/lib/admin/session");
    const cookie = encodeSession({ email: "demo@stixnvibes.com", exp: Date.now() + 60_000 }, "demo-only-session-secret-not-for-production");
    expect((await call("GET", "me", undefined, cookie)).status).toBe(401);
  });

  it("returns the admin for a good token", async () => {
    const { status, data } = await call("GET", "me");
    expect(status).toBe(200);
    expect(data.email).toBe("demo@stixnvibes.com");
    expect(data.mode).toBe("demo");
  });

  it("404s unknown paths and 405s wrong methods", async () => {
    expect((await call("GET", "nothing-here")).status).toBe(404);
    expect((await call("POST", "dashboard")).status).toBe(405);
  });
});

describe("admin app API reads", () => {
  it("serves the dashboard, analytics, stalls and stall mode", async () => {
    const dash = await call("GET", "dashboard?days=30");
    expect(dash.status).toBe(200);
    expect(dash.data.days).toBe(30);
    expect(dash.data.stats).toHaveProperty("visits");
    const an = await call("GET", "analytics?days=90");
    expect(an.data.stats.daily).toBeInstanceOf(Array);
    expect(an.data.stalls).toHaveProperty("profitPaise");
    expect((await call("GET", "stalls")).data).toHaveProperty("totals");
    const ins = await call("GET", "insights");
    expect(ins.status).toBe(200);
    expect(ins.data).toHaveProperty("stalls");
    expect(ins.data).toHaveProperty("venues");
    expect(ins.data.restock).toBeInstanceOf(Array);
    expect(ins.data.repeat).toHaveProperty("rate");
    const sm = await call("GET", "stall-mode");
    expect(sm.data.products.length).toBeGreaterThan(0);
    expect(sm.data.products.every((p: { pricePaise: number }) => typeof p.pricePaise === "number")).toBe(true);
  });
});

describe("admin app API changes", () => {
  it("edits a product through the shared rules", async () => {
    const { data } = await call("GET", "products");
    const p = data.products[0];
    expect((await call("POST", `products/${p.id}/quick`, { op: "stock", stock: 7 })).status).toBe(200);
    expect((await call("GET", `products/${p.id}`)).data.product.stock).toBe(7);
    const bad = await call("POST", `products/${p.id}/quick`, { op: "stock", stock: -1 });
    expect(bad.status).toBe(422);
    expect(bad.data.error).toMatch(/whole number/);
    expect((await call("POST", "products", { name: "" })).status).toBe(422);
  });

  it("records stall sales once, even when the phone sends them twice", async () => {
    const sale = {
      id: "s-app-test-0001",
      stallId: null,
      lines: [{ productId: "", name: "Mystery sticker", type: "other", options: [], qty: 2, unitPricePaise: 1000, lineTotalPaise: 2000 }],
      subtotalPaise: 2000,
      discountPaise: 0,
      totalPaise: 2000,
      payment: "upi",
      note: "",
      soldAt: new Date().toISOString(),
    };
    const first = await call("POST", "stall-sales", { sales: [sale] });
    expect(first.data.results[0]).toMatchObject({ ok: true, created: true });
    const again = await call("POST", "stall-sales", { sales: [sale] });
    expect(again.data.results[0]).toMatchObject({ ok: true, created: false });
    expect((await call("DELETE", `stall-sales/${sale.id}`)).status).toBe(200);
  });

  it("saves a stall and reports on it", async () => {
    const saved = await call("POST", "stalls", { name: "App test stall", date: "2026-11-01", venue: "", collegeId: "", fee: "1500", otherCosts: "", notes: "", public: false });
    expect(saved.status).toBe(200);
    const one = await call("GET", `stalls/${saved.data.id}`);
    expect(one.data.report.profitPaise).toBe(-150_000);
    expect((await call("DELETE", `stalls/${saved.data.id}`)).status).toBe(200);
  });

  it("validates settings and coupons with the web admin's messages", async () => {
    const s = await call("PUT", "settings", { instagramHandle: "", storeOpen: true });
    expect(s.data.error).toBe("Enter the Instagram username, like stixnvibes.");
    const c = await call("POST", "coupons", { code: "APPTEST10", isNew: "1", description: "", kind: "percent", value: "10", minOrder: "", maxUses: "", source: "", active: true });
    expect(c.data).toMatchObject({ ok: true, id: "APPTEST10" });
    const list = await call("GET", "coupons");
    expect(list.data.coupons.find((x: { code: string }) => x.code === "APPTEST10")).toMatchObject({ uses: 0, active: true });
  });
});

describe("route table", () => {
  it("lists every route in the API doc", async () => {
    const { readFileSync } = await import("node:fs");
    const doc = readFileSync("docs/ADMIN_APP_API.md", "utf8");
    for (const r of api.ROUTES) expect(doc, r).toContain(`\`${r}\``);
  });
});
