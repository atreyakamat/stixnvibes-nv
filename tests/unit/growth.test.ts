import { afterEach, describe, expect, it, vi } from "vitest";
import { mailOwner } from "@/lib/mail";
import { priceLines } from "@/lib/orders";
import { couponDiscount, couponProblem, isSoldOut, normalizeCode, stockShortfalls, totals } from "@/lib/pricing";
import { dilate, emptyMask, nest, setCell } from "@/lib/nest";
import { A4_TEMPLATE, blankSheet, CELL_IN, crc32, DEFAULT_SPEC, designBox, gapCells, inPrintArea, SHEET_PX, specProblem, withDpi } from "@/lib/sheet-layout";
import { computeStats, MemoryStore } from "@/lib/store/memory";
import { demoProducts, seedOffers } from "@/lib/store/seed";
import type { Coupon, Order } from "@/lib/types";
import { cleanSource, customRequestSchema, orderSchema } from "@/lib/validation";

const coupon = (over: Partial<Coupon> = {}): Coupon => ({
  code: "WORDSUP10",
  description: "",
  percent: 10,
  amountPaise: null,
  minOrderPaise: 0,
  maxUses: null,
  startsAt: null,
  endsAt: null,
  source: "stall-wordsup",
  active: true,
  createdAt: "2026-10-01T00:00:00Z",
  ...over,
});
const sticker = (qty: number) => ({ type: "sticker" as const, unitPricePaise: 1000, qty });
const offers = seedOffers();

describe("coupon codes", () => {
  it("takes % off what's left after the offers, rounded down", () => {
    // 5 stickers: ₹50, 5th free → ₹40, then 10% → ₹36.
    const t = totals([sticker(5)], offers, coupon());
    expect(t).toMatchObject({ subtotalPaise: 5000, totalPaise: 3600, discountPaise: 1400, couponCode: "WORDSUP10", couponProblem: null });
    expect(t.applied.at(-1)).toEqual({ offerId: "coupon:WORDSUP10", name: "Code WORDSUP10", freeUnits: 0, discountPaise: 400 });
    expect(couponDiscount({ percent: 15, amountPaise: null }, 999)).toBe(149);
  });

  it("takes a flat amount, never below zero", () => {
    expect(totals([sticker(2)], offers, coupon({ percent: null, amountPaise: 5000 })).totalPaise).toBe(0);
    expect(totals([sticker(3)], offers, coupon({ percent: null, amountPaise: 500 })).totalPaise).toBe(2500);
  });

  it("checks dates, uses and the minimum order", () => {
    const now = new Date("2026-10-26T10:00:00Z");
    expect(couponProblem(coupon({ active: false }), 5000, 0, now)).toMatch(/isn't running/);
    expect(couponProblem(coupon({ endsAt: "2026-10-26T09:00:00Z" }), 5000, 0, now)).toMatch(/isn't running/);
    expect(couponProblem(coupon({ startsAt: "2026-10-27T00:00:00Z" }), 5000, 0, now)).toMatch(/isn't running/);
    expect(couponProblem(coupon({ maxUses: 3 }), 5000, 3, now)).toMatch(/used up/);
    expect(couponProblem(coupon({ maxUses: 3 }), 5000, 2, now)).toBeNull();
    expect(couponProblem(coupon({ minOrderPaise: 15000 }), 14000, 0, now)).toMatch(/₹150 or more/);
    // A code that doesn't apply gives nothing off and says why.
    const t = totals([sticker(2)], offers, coupon({ minOrderPaise: 15000 }));
    expect(t).toMatchObject({ totalPaise: 2000, couponCode: "", couponProblem: expect.stringMatching(/₹150/) });
  });

  it("reads codes however they're typed", () => {
    expect(normalizeCode(" wordsup 10 ")).toBe("WORDSUP10");
  });

  it("prices an order with the code on the server, counting past uses", () => {
    const products = demoProducts();
    const r = priceLines([{ productId: "p-lofi-01", qty: 5, selections: {}, custom: {} }], products, offers, coupon({ maxUses: 1 }), 1);
    expect(r.couponProblem).toMatch(/used up/);
    expect(r.totalPaise).toBe(4000);
  });
});

describe("stock", () => {
  it("is sold out at 0 and blocks asking for more than there is", () => {
    expect(isSoldOut({ soldOut: false, stock: 0 })).toBe(true);
    expect(isSoldOut({ soldOut: false, stock: null })).toBe(false);
    const products = [{ id: "a", name: "Lo-fi 01", stock: 4 }];
    expect(stockShortfalls([{ productId: "a", qty: 3 }, { productId: "a", qty: 2 }], products)).toEqual([{ productId: "a", name: "Lo-fi 01", stock: 4 }]);
    expect(stockShortfalls([{ productId: "a", qty: 4 }], products)).toEqual([]);

    const demo = demoProducts();
    const r = priceLines([{ productId: "p-lofi-01", qty: 41, selections: {}, custom: {} }], demo, offers);
    expect(r.problems[0].reason).toBe("Lo-fi 01: only 40 left. Lower the quantity to 40.");
  });

  it("comes off once when confirmed and goes back once when cancelled", async () => {
    const store = new MemoryStore();
    const lines = priceLines([{ productId: "p-lofi-01", qty: 3, selections: {}, custom: {} }], await store.listProducts(), offers).lines;
    await store.createOrder({
      number: "SNV-STOCK1",
      viewKey: "k".repeat(22),
      customerName: "A",
      customerPhone: "9876543210",
      fulfilment: "pickup",
      address: { line: "", city: "", state: "", pincode: "" },
      customerNote: "",
      lines,
      subtotalPaise: 3000,
      discountPaise: 0,
      totalPaise: 3000,
      offers: [],
      couponCode: "",
      source: "",
      instagram: "",
    });
    const stock = async () => (await store.getProduct("p-lofi-01"))!.stock;
    await store.moveStock("SNV-STOCK1", -1);
    await store.moveStock("SNV-STOCK1", -1); // second click: no change
    expect(await stock()).toBe(37);
    expect((await store.getOrder("SNV-STOCK1"))!.stockTaken).toBe(true);
    await store.moveStock("SNV-STOCK1", 1);
    await store.moveStock("SNV-STOCK1", 1);
    expect(await stock()).toBe(40);
  });
});

describe("analytics", () => {
  const order = (n: string, o: Partial<Order>): Order => ({
    id: n,
    number: n,
    viewKey: "",
    status: "new",
    customerName: "",
    customerPhone: "",
    fulfilment: "pickup",
    address: { line: "", city: "", state: "", pincode: "" },
    customerNote: "",
    lines: [{ productId: "p1", slug: "x", name: "X", type: "sticker", image: null, options: [], custom: [], unitPricePaise: 1000, qty: 2, lineTotalPaise: 2000 }],
    subtotalPaise: 2000,
    discountPaise: 0,
    totalPaise: 2000,
    offers: [],
    adminNote: "",
    couponCode: "",
    source: "",
    instagram: "",
    stockTaken: false,
    trackingNumber: "",
    createdAt: "2026-10-20T10:00:00Z",
    updatedAt: "2026-10-20T10:00:00Z",
    ...o,
  });

  it("counts the funnel, sources and codes", () => {
    const at = "2026-10-20T09:00:00Z";
    const events = [
      { type: "visit" as const, productId: null, path: "/", source: "stall-wordsup", at },
      { type: "visit" as const, productId: null, path: "/", source: "stall-wordsup", at },
      { type: "visit" as const, productId: null, path: "/", source: "", at },
      { type: "view" as const, productId: "p1", path: "/shop/x", at },
      { type: "checkout" as const, productId: null, path: "/cart", at },
    ];
    const orders = [
      order("SNV-A", { status: "paid", source: "stall-wordsup", couponCode: "WORDSUP10", totalPaise: 1800, offers: [{ offerId: "coupon:WORDSUP10", name: "Code", freeUnits: 0, discountPaise: 200 }] }),
      order("SNV-B", { status: "new", source: "stall-wordsup", couponCode: "WORDSUP10" }),
      order("SNV-C", { status: "cancelled" }),
      order("SNV-D", { status: "confirmed" }),
    ];
    const s = computeStats(events, orders, "2026-10-01T00:00:00Z");
    expect(s).toMatchObject({ visits: 3, views: 1, checkouts: 1, orders: 3, sales: 2, salesPaise: 3800, paid: 1 });
    expect(s.bySource).toEqual([
      { source: "direct", visits: 1, orders: 1, sales: 1, salesPaise: 2000 },
      { source: "stall-wordsup", visits: 2, orders: 2, sales: 1, salesPaise: 1800 },
    ]);
    expect(s.byCoupon).toEqual([{ code: "WORDSUP10", orders: 2, sales: 1, salesPaise: 1800, discountPaise: 200 }]);
    expect(s.byType).toEqual([{ type: "sticker", qty: 4, paise: 4000 }]);
    expect(s.daily).toEqual([{ day: "2026-10-20", views: 1, visits: 3, orders: 3, salesPaise: 3800 }]);
  });

  it("keeps sources to short safe slugs", () => {
    expect(cleanSource("Stall WordsUp!! <script>")).toBe("stall-wordsup-script");
    expect(cleanSource("x".repeat(100))).toHaveLength(40);
  });
});

describe("checkout and custom request input", () => {
  const base = { lines: [{ productId: "p", qty: 1 }], customerName: "Asha", customerPhone: "9876543210", fulfilment: "pickup" };

  it("takes an optional Instagram username in any common form", () => {
    expect(orderSchema.parse({ ...base, instagram: "https://instagram.com/asha.draws/" }).instagram).toBe("asha.draws");
    expect(orderSchema.parse(base).instagram).toBe("");
    expect(orderSchema.safeParse({ ...base, instagram: "not a handle!" }).success).toBe(false);
  });

  it("needs real upload ids and a sane quantity for custom requests", () => {
    const ok = { customerName: "Asha", customerPhone: "9876543210", kind: "sticker", qty: "100", files: ["a".repeat(32)] };
    expect(customRequestSchema.parse(ok)).toMatchObject({ qty: 100, instagram: "", size: "", source: "" });
    expect(customRequestSchema.safeParse({ ...ok, files: [] }).success).toBe(false);
    expect(customRequestSchema.safeParse({ ...ok, files: ["../../etc/passwd"] }).success).toBe(false);
    expect(customRequestSchema.safeParse({ ...ok, kind: "car" }).success).toBe(false);
    expect(customRequestSchema.safeParse({ ...ok, qty: "0" }).success).toBe(false);
  });
});

describe("owner email", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("does nothing until Resend is set up", async () => {
    const f = vi.fn();
    expect(await mailOwner({ subject: "x", text: "x", html: "x" }, f as unknown as typeof fetch)).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it("sends through Resend with attachments, a clean subject and no redirects", async () => {
    vi.stubEnv("SHOP_DEMO_MODE", "false");
    vi.stubEnv("SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "k");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("NOTIFY_EMAIL", "owner@example.com, not-an-email");
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    const ok = await mailOwner(
      { subject: "New order\r\nBcc: evil@example.com", text: "t", html: "<p>t</p>", attachments: [{ filename: "a.png", content: Buffer.from("png") }] },
      f as unknown as typeof fetch,
    );
    expect(ok).toBe(true);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.redirect).toBe("error");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ to: ["owner@example.com"], subject: "New order Bcc: evil@example.com", attachments: [{ filename: "a.png", content: "cG5n" }] });
  });

  it("reports a failure instead of throwing", async () => {
    vi.stubEnv("SHOP_DEMO_MODE", "false");
    vi.stubEnv("SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "k");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("NOTIFY_EMAIL", "owner@example.com");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await mailOwner({ subject: "x", text: "x", html: "x" }, (async () => new Response("bad", { status: 422 })) as unknown as typeof fetch)).toBe(false);
    expect(await mailOwner({ subject: "x", text: "x", html: "x" }, (async () => Promise.reject(new Error("down"))) as unknown as typeof fetch)).toBe(false);
    err.mockRestore();
  });
});

describe("Cricut sheets", () => {
  const square = (sideIn: number) => {
    const n = Math.ceil(sideIn / CELL_IN);
    const m = emptyMask(n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) setCell(m, x, y);
    return m;
  };
  /** An L: a square with its top-right quarter missing, so turning it matters. */
  const ell = (sideIn: number, quarterTurns: number) => {
    const n = Math.ceil(sideIn / CELL_IN);
    const m = emptyMask(n, n);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        // Rotate the "missing" quarter around the square.
        const [u, v] = [[x, y], [y, n - 1 - x], [n - 1 - x, n - 1 - y], [n - 1 - y, x]][quarterTurns];
        if (!(u >= n / 2 && v < n / 2)) setCell(m, x, y);
      }
    return m;
  };

  it("uses the A4 Print Then Cut template: 7.2 × 10.62 in with stepped corners", () => {
    expect(SHEET_PX).toEqual({ w: 2160, h: 3186 });
    expect(inPrintArea(3.6, 5.3)).toBe(true);
    expect(inPrintArea(0.1, 0.1)).toBe(false); // corner mark
    expect(inPrintArea(1, 0.2)).toBe(false); // inside the long step
    expect(inPrintArea(0.2, 1)).toBe(false);
    expect(inPrintArea(1.3, 0.1)).toBe(true); // past the long step
    expect(inPrintArea(0.4, 0.4)).toBe(true); // inside the L
    expect(inPrintArea(7.1, 10.5)).toBe(false);
    const g = blankSheet();
    expect(g.fits(square(0.3), 0, 0)).toBe(false);
    expect(g.fits(square(0.3), Math.round(1.28 / CELL_IN), 0)).toBe(true);
    expect(g.fits(square(0.3), Math.round(0.34 / CELL_IN), Math.round(0.34 / CELL_IN))).toBe(true);
  });

  it("packs 5 cm stickers with a 3 mm gap, never overlapping, and spills onto more sheets", () => {
    const pad = gapCells(0.3 / 2.54);
    const shape = square(5 / 2.54);
    const r = nest([{ key: "a", qty: 30, variants: [{ angle: 0, shape, clearance: dilate(shape, pad), pad }] }], blankSheet);
    // 3 across × 4 down, plus one more in a 5th row between the corner marks.
    expect(r.sheets.map((s) => s.length)).toEqual([13, 13, 4]);
    // Replay the placements on fresh sheets: every sticker lands on free, printable cells.
    for (const s of r.sheets) {
      const g = blankSheet();
      for (const p of s) {
        expect(g.fits(shape, p.x, p.y)).toBe(true);
        g.place(shape, p.x, p.y);
      }
      // And keeps the gap from each other.
      for (const [i, p] of s.entries())
        for (const q of s.slice(i + 1)) {
          const apart = Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y)) - shape.w;
          expect(apart).toBeGreaterThanOrEqual(pad);
        }
    }
  });

  it("turns shapes so they interlock and fit more", () => {
    const pad = gapCells(0.1);
    const variant = (q: number) => {
      const shape = ell(1.5, q);
      return { angle: q * 90, shape, clearance: dilate(shape, pad), pad };
    };
    const still = nest([{ key: "l", qty: 200, variants: [variant(0)] }], blankSheet).sheets[0].length;
    const turned = nest([{ key: "l", qty: 200, variants: [0, 1, 2, 3].map(variant) }], blankSheet).sheets[0].length;
    expect(turned).toBeGreaterThan(still);
  });

  it("keeps each design's shape and refuses stickers bigger than the sheet", () => {
    expect(designBox(2, 2)).toEqual({ w: 600, h: 300 });
    expect(designBox(0.5, 2)).toEqual({ w: 300, h: 600 });
    expect(specProblem({ ...DEFAULT_SPEC, sizeIn: 12 })).toMatch(/don't fit/);
    expect(specProblem(DEFAULT_SPEC)).toBeNull();
    const huge = square(A4_TEMPLATE.widthIn + 1);
    expect(nest([{ key: "x", qty: 1, variants: [{ angle: 0, shape: huge, clearance: huge, pad: 0 }] }], blankSheet).tooBig).toEqual(["x"]);
  });

  it("stamps 300 DPI into the PNG", () => {
    // Smallest valid PNG: signature, IHDR, IDAT, IEND.
    const png = Uint8Array.from(
      Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000" + "1f15c489" + "0000000d49444154789c6360000002000154a24f5d" + "0000000049454e44ae426082", "hex"),
    );
    const out = withDpi(png, 300);
    const hex = Buffer.from(out).toString("hex");
    const at = hex.indexOf("70485973"); // pHYs
    expect(at).toBeGreaterThan(0);
    expect(hex.slice(at + 8, at + 26)).toBe("00002e2300002e2301"); // 11811 px/m both ways, unit metre
    expect(crc32(new TextEncoder().encode("IEND"))).toBe(0xae426082);
    expect(withDpi(out, 300)).toHaveLength(out.length); // replaces, never stacks
  });
});
