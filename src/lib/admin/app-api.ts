import "server-only";
import { z } from "zod";
import { site } from "@/content/site";
import * as ops from "@/lib/admin/ops";
import { moderateReview, removeReview } from "@/lib/admin/reviews";
import { checkCredentials, getAppAdmin, issueAppToken } from "@/lib/admin/session";
import { syncStallSales } from "@/lib/admin/stall-sync";
import { json, readJson } from "@/lib/api";
import { CUSTOM_NUMBER_RE, ORDER_NUMBER_RE } from "@/lib/constants";
import { goalReport, istDayStart, istToday, stallReport, topProducts } from "@/lib/costs";
import { type CustomerSort, customersFromOrders, sortCustomers } from "@/lib/customers";
import { storeMode } from "@/lib/env";
import { orderUrl } from "@/lib/orders";
import { normalizePhone } from "@/lib/phone";
import { clearRateLimit, rateLimit } from "@/lib/rate-limit";
import { syncSchema, tally } from "@/lib/stall";
import { rankStalls, repeatBuyers, restockList } from "@/lib/insights";
import { getStoreOrNull, type Store } from "@/lib/store";
import { ORDER_STATUSES, REVIEW_STATUSES, type Product } from "@/lib/types";

// The Android admin app's API: /api/app/admin/<path>. JSON in and out, a
// bearer token from POST login on everything else. Reads return the same
// data the web admin pages show; every change goes through lib/admin/ops.ts,
// so the app and the web admin follow the same rules.

type Ctx = { req: Request; store: Store; params: string[]; url: URL };
type Handler = (ctx: Ctx) => Promise<Response>;
type Route = { method: string; path: string; handler: Handler };

const routes: Route[] = [];
const on = (method: string, path: string, handler: Handler) => routes.push({ method, path, handler });

/** "orders/:n/ship" against ["orders", "SNV-ABC123", "ship"]: the params, or null. */
function match(pattern: string, parts: string[]): string[] | null {
  const want = pattern.split("/");
  if (want.length !== parts.length) return null;
  const params: string[] = [];
  for (let i = 0; i < want.length; i++) {
    if (want[i].startsWith(":")) params.push(decodeURIComponent(parts[i]));
    else if (want[i] !== parts[i]) return null;
  }
  return params;
}

const done = (r: ops.OpResult) => (r.ok ? json(r) : json(r, 422));
const notFound = () => json({ error: "Not found." }, 404);
const body = async (req: Request) => ((await readJson(req)) ?? {}) as Record<string, unknown>;
const bool = (v: unknown) => v === true || v === "on" || v === "true" || v === "1";
const text = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");

/** Midnight a number of days back (today counts as one), as the dashboard does it. */
function sinceDays(days: number) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));
  return since.toISOString();
}
const days = (url: URL, allowed: number[], fallback: number) => {
  const d = Number(url.searchParams.get("days"));
  return allowed.includes(d) ? d : fallback;
};

const names = (products: Product[]) => Object.fromEntries(products.map((p) => [p.id, p.name]));
const lowStock = (products: Product[]) =>
  products
    .filter((p) => p.stock !== null && p.status !== "hidden" && p.stock <= p.lowStockAt)
    .sort((a, b) => a.stock! - b.stock!)
    .map((p) => ({ id: p.id, name: p.name, stock: p.stock!, lowStockAt: p.lowStockAt, image: p.images[0] ?? null }));

// Account ---------------------------------------------------------------

on("GET", "me", async ({ req }) => json({ email: getAppAdmin(req)!.email, mode: storeMode(), shopUrl: site.url }));

// Dashboard and analytics -----------------------------------------------

on("GET", "dashboard", async ({ store, url }) => {
  const d = days(url, [1, 7, 30, 90], 7);
  const [stats, orders, products, settings, stalls] = await Promise.all([
    store.stats(sinceDays(d)),
    store.listOrders({ limit: 8 }),
    store.listProducts({ includeHidden: true }),
    store.getSettings(),
    store.listStalls(),
  ]);
  const goalSince = istDayStart(settings.goalStart);
  const [goalOrders, goalSales] = await Promise.all([store.listOrders({ createdSince: goalSince, limit: 5000 }), store.listStallSales({ since: goalSince })]);
  const goal = settings.goalPaise ? goalReport(settings, goalOrders, goalSales, stalls, products) : null;
  const unpriced = products.filter((p) => p.status === "live" && p.pricePaise === null).length;
  const low = lowStock(products);
  const warnings = [
    !settings.storeOpen && "Online orders are paused. Turn them on in Settings.",
    unpriced > 0 && `${unpriced} live product${unpriced === 1 ? " has" : "s have"} no price, so customers see "Ask on Instagram".`,
    low.length > 0 && `${low.length} product${low.length === 1 ? " is" : "s are"} low on stock or sold out.`,
  ].filter(Boolean);
  const today = istToday();
  const nextStall = stalls.filter((s) => s.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
  return json({
    days: d,
    stats,
    goal,
    goalStart: settings.goalStart,
    goalBy: settings.goalBy,
    warnings,
    latestOrders: orders,
    newOrders: orders.filter((o) => o.status === "new").length,
    nextStall,
    productNames: names(products),
  });
});

on("GET", "analytics", async ({ store, url }) => {
  const d = days(url, [7, 30, 90, 365], 30);
  const since = sinceDays(d);
  const [stats, products, stalls, sales, settings] = await Promise.all([
    store.stats(since),
    store.listProducts({ includeHidden: true }),
    store.listStalls(),
    store.listStallSales({ since }),
    store.getSettings(),
  ]);
  // Stall takings in the same period, next to the online numbers.
  const inPeriod = stalls.filter((s) => s.date >= since.slice(0, 10));
  const stallTotals = tally(sales);
  const reports = inPeriod.map((s) => stallReport(s, sales, products, settings.unitCosts));
  return json({
    days: d,
    stats,
    lowStock: lowStock(products),
    productNames: names(products),
    stalls: {
      ...stallTotals,
      profitPaise: reports.reduce((n, r) => n + r.profitPaise, 0),
      count: inPeriod.length,
      topProducts: topProducts(sales, 10),
    },
  });
});

// Which stalls to go back to, what to restock, who comes back. All time for
// stalls and buyers; the last 30 days of selling pace for restock.
on("GET", "insights", async ({ store }) => {
  const [products, stalls, sales, orders, settings] = await Promise.all([
    store.listProducts({ includeHidden: true }),
    store.listStalls(),
    store.listStallSales({}),
    store.listOrders({ limit: 5000 }),
    store.getSettings(),
  ]);
  return json({
    ...rankStalls(stalls, sales, products, settings.unitCosts, istToday()),
    restock: restockList(products, orders, sales),
    repeat: repeatBuyers(orders),
  });
});

// What's new since the phone last looked, for its order alerts. Checked in
// the background every 15 minutes or so, so it stays small.
on("GET", "alerts", async ({ store, url }) => {
  const now = new Date().toISOString();
  const raw = url.searchParams.get("since") ?? "";
  const since = Number.isFinite(Date.parse(raw)) ? new Date(raw).toISOString() : now;
  const [orders, custom, reviews, products] = await Promise.all([
    store.listOrders({ createdSince: since, limit: 50 }),
    store.listCustomRequests(50),
    store.listReviews({ status: "pending", limit: 50 }),
    store.listProducts({ includeHidden: true }),
  ]);
  const name = names(products);
  return json({
    now,
    orders: orders.filter((o) => o.createdAt > since).map((o) => ({ number: o.number, customerName: o.customerName, totalPaise: o.totalPaise, createdAt: o.createdAt })),
    custom: custom.filter((r) => r.createdAt > since).map((r) => ({ number: r.number, customerName: r.customerName, createdAt: r.createdAt })),
    reviews: reviews.filter((r) => r.createdAt > since).map((r) => ({ id: r.id, name: r.name, rating: r.rating, productName: name[r.productId] ?? "a product", createdAt: r.createdAt })),
  });
});

// Orders and packing ----------------------------------------------------

on("GET", "orders", async ({ store, url }) => {
  const status = ORDER_STATUSES.find((s) => s === url.searchParams.get("status"));
  const search = url.searchParams.get("q")?.slice(0, 60) || undefined;
  return json({ orders: await store.listOrders({ status, search, limit: 200 }) });
});

on("GET", "orders/:n", async ({ store, params: [n] }) => {
  if (!ORDER_NUMBER_RE.test(n)) return notFound();
  const order = await store.getOrder(n);
  if (!order) return notFound();
  const history = order.customerPhone ? (await store.listOrders({ search: order.customerPhone, limit: 50 })).filter((o) => o.customerPhone === order.customerPhone) : [order];
  return json({ order, orderUrl: orderUrl(order), customerOrders: history.length });
});

on("PATCH", "orders/:n", async ({ req, store, params: [n] }) => {
  const b = await body(req);
  const current = await store.getOrder(n);
  if (!current) return notFound();
  return done(await ops.updateOrder({ number: n, status: b.status ?? current.status, adminNote: typeof b.adminNote === "string" ? b.adminNote : current.adminNote }));
});

on("POST", "orders/:n/ship", async ({ req, params: [n] }) => {
  const b = await body(req);
  return done(await ops.shipOrder({ number: n, trackingNumber: text(b.trackingNumber), markShipped: bool(b.markShipped) }));
});

on("GET", "packing", async ({ store }) => {
  const orders = (await store.listOrders({ limit: 500 })).filter((o) => o.fulfilment === "delivery");
  return json({
    toPack: orders.filter((o) => o.status === "paid").reverse(),
    waiting: orders.filter((o) => o.status === "confirmed"),
    shipped: orders.filter((o) => o.status === "shipped").slice(0, 20),
  });
});

// Customers -------------------------------------------------------------

on("GET", "customers", async ({ store, url }) => {
  const sort = (["recent", "spent", "orders"] as const).find((s) => s === url.searchParams.get("sort")) ?? ("recent" as CustomerSort);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 60);
  const all = customersFromOrders(await store.listOrders({ limit: 5000 }));
  const digits = q.replace(/\D/g, "");
  const list = sortCustomers(all, sort).filter((c) => !q || c.name.toLowerCase().includes(q) || (digits.length >= 3 && c.phone.includes(digits)));
  return json({ customers: list.slice(0, 300), total: all.length, repeat: all.filter((c) => c.orders > 1).length });
});

on("GET", "customers/:phone", async ({ store, params: [raw] }) => {
  const phone = normalizePhone(raw);
  if (!phone) return notFound();
  const orders = (await store.listOrders({ search: phone, limit: 500 })).filter((o) => o.customerPhone === phone);
  const [customer] = customersFromOrders(orders);
  return customer ? json({ customer, orders }) : notFound();
});

// Products, collections, images -----------------------------------------

on("GET", "products", async ({ store }) => {
  const [products, collections] = await Promise.all([store.listProducts({ includeHidden: true }), store.listCollections({ includeHidden: true })]);
  return json({ products, collections });
});
on("GET", "products/:id", async ({ store, params: [id] }) => {
  const [product, collections] = await Promise.all([store.getProduct(id), store.listCollections({ includeHidden: true })]);
  return product ? json({ product, collections }) : notFound();
});
on("POST", "products", async ({ req }) => done(await ops.saveProduct(await body(req), null)));
on("PUT", "products/:id", async ({ req, params: [id] }) => done(await ops.saveProduct(await body(req), id)));
on("DELETE", "products/:id", async ({ params: [id] }) => done(await ops.deleteProduct(id)));
on("POST", "products/:id/quick", async ({ req, params: [id] }) => {
  const b = await body(req);
  const stock = b.stock === null || b.stock === "" ? null : typeof b.stock === "number" ? b.stock : undefined;
  return done(await ops.quickProduct(id, text(b.op), stock));
});
on("POST", "products-bulk", async ({ req }) => done(await ops.bulkCreate(await body(req))));

on("POST", "images", async ({ req }) => {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Send the photo as multipart form data, field \"file\"." }, 400);
  }
  const r = await ops.uploadProductImage(form.get("file"));
  return r.url ? json(r) : json(r, 422);
});

on("GET", "collections", async ({ store }) => json({ collections: await store.listCollections({ includeHidden: true }) }));
on("GET", "collections/:id", async ({ store, params: [id] }) => {
  const [collection, products] = await Promise.all([store.getCollection(id), store.listProducts({ includeHidden: true })]);
  if (!collection) return notFound();
  return json({ collection, productIds: products.filter((p) => p.collectionIds.includes(id)).map((p) => p.id) });
});
on("POST", "collections", async ({ req }) => done(await ops.saveCollection(await body(req), null)));
on("PUT", "collections/:id", async ({ req, params: [id] }) => done(await ops.saveCollection(await body(req), id)));
on("DELETE", "collections/:id", async ({ params: [id] }) => done(await ops.deleteCollection(id)));

// Offers and codes ------------------------------------------------------

on("GET", "offers", async ({ store }) => json({ offers: await store.listOffers({ includeInactive: true }) }));
on("POST", "offers", async ({ req }) => {
  const b = await body(req);
  return done(await ops.saveOffer({ ...b, active: bool(b.active) }));
});
on("DELETE", "offers/:id", async ({ params: [id] }) => done(await ops.deleteOffer(id)));

on("GET", "coupons", async ({ store }) => {
  const coupons = await store.listCoupons();
  const uses = await Promise.all(coupons.map((c) => store.couponUses(c.code)));
  return json({ coupons: coupons.map((c, i) => ({ ...c, uses: uses[i] })), shopUrl: site.url });
});
on("POST", "coupons", async ({ req }) => {
  const b = await body(req);
  return done(await ops.saveCoupon({ ...b, active: bool(b.active) }));
});
on("DELETE", "coupons/:code", async ({ params: [code] }) => done(await ops.deleteCoupon(code)));

// Custom requests -------------------------------------------------------

on("GET", "custom", async ({ store }) => json({ requests: await store.listCustomRequests(200) }));
on("GET", "custom/:n", async ({ store, params: [n] }) => {
  if (!CUSTOM_NUMBER_RE.test(n)) return notFound();
  const request = await store.getCustomRequest(n);
  if (!request) return notFound();
  return json({ request, files: request.files.map((id) => `${site.url}/u/${id}`) });
});
on("PATCH", "custom/:n", async ({ req, params: [n] }) => {
  const b = await body(req);
  return done(await ops.updateCustomRequest({ number: n, status: b.status, adminNote: text(b.adminNote) }));
});

// Reviews ---------------------------------------------------------------

on("GET", "reviews", async ({ store, url }) => {
  const status = REVIEW_STATUSES.find((s) => s === url.searchParams.get("status")) ?? "pending";
  const [reviews, all, products] = await Promise.all([store.listReviews({ status, limit: 300 }), store.listReviews({ limit: 2000 }), store.listProducts({ includeHidden: true })]);
  const byId = new Map(products.map((p) => [p.id, p]));
  // A verified review's order gives a phone number to WhatsApp the buyer.
  const phones = new Map<string, string>();
  for (const n of new Set(reviews.map((r) => r.orderNumber).filter((n): n is string => !!n))) {
    const o = await store.getOrder(n);
    if (o?.customerPhone) phones.set(n, o.customerPhone);
  }
  const live = all.filter((r) => r.status === "published");
  return json({
    status,
    counts: Object.fromEntries(REVIEW_STATUSES.map((s) => [s, all.filter((r) => r.status === s).length])),
    average: live.length ? Math.round((live.reduce((n, r) => n + r.rating, 0) / live.length) * 10) / 10 : null,
    reviews: reviews.map((r) => ({
      ...r,
      productName: byId.get(r.productId)?.name ?? "Deleted product",
      productImage: byId.get(r.productId)?.images[0] ?? null,
      photoUrls: r.photos.map((id) => `${site.url}/u/${id}`),
      customerPhone: (r.orderNumber && phones.get(r.orderNumber)) || null,
    })),
  });
});
on("PATCH", "reviews/:id", async ({ req, params: [id] }) => {
  const b = await body(req);
  return done(await moderateReview(id, { ...(b.status !== undefined ? { status: b.status } : {}), ...(b.reply !== undefined ? { reply: b.reply } : {}) }));
});
on("DELETE", "reviews/:id", async ({ params: [id] }) => done(await removeReview(id)));

// Settings, costs and goal ----------------------------------------------

on("GET", "settings", async ({ store }) => {
  const [settings, products] = await Promise.all([store.getSettings(), store.listProducts({ includeHidden: true })]);
  // Option choices per type, for the unit costs editor ("poster:a3").
  const choices: Record<string, { key: string; label: string }[]> = {};
  for (const p of products)
    for (const g of p.options)
      for (const v of g.values) {
        const list = (choices[p.type] ??= []);
        const key = `${p.type}:${v.id}`;
        if (!list.some((c) => c.key === key)) list.push({ key, label: `${g.name}: ${v.label}` });
      }
  return json({ settings, costChoices: choices });
});
on("PUT", "settings", async ({ req }) => {
  const b = await body(req);
  return done(await ops.saveSettings({ ...b, storeOpen: bool(b.storeOpen) }));
});
on("PUT", "costs", async ({ req }) => {
  const b = await body(req);
  return done(await ops.saveCosts({ costs: b.costs, goal: text(b.goal), goalStart: text(b.goalStart), goalBy: text(b.goalBy) }));
});

// Stalls and stall mode -------------------------------------------------

on("GET", "stalls", async ({ store }) => {
  const [stalls, sales, products, colleges, settings] = await Promise.all([
    store.listStalls(),
    store.listStallSales(),
    store.listProducts({ includeHidden: true }),
    store.listColleges({ includeHidden: true }),
    store.getSettings(),
  ]);
  const today = istToday();
  const reports = stalls.map((s) => stallReport(s, sales, products, settings.unitCosts));
  const past = reports.filter((r) => r.stall.date <= today);
  return json({
    upcoming: reports.filter((r) => r.stall.date > today).reverse(),
    past,
    totals: past.reduce((t, r) => ({ revenuePaise: t.revenuePaise + r.revenuePaise, profitPaise: t.profitPaise + r.profitPaise }), { revenuePaise: 0, profitPaise: 0 }),
    colleges: colleges.map((c) => ({ id: c.id, name: c.name })),
  });
});
on("GET", "stalls/:id", async ({ store, params: [id] }) => {
  const stall = await store.getStall(id);
  if (!stall) return notFound();
  const [sales, products, settings] = await Promise.all([store.listStallSales({ stallId: id }), store.listProducts({ includeHidden: true }), store.getSettings()]);
  return json({ report: stallReport(stall, sales, products, settings.unitCosts), sales, top: topProducts(sales, 10), productNames: names(products) });
});
on("POST", "stalls", async ({ req }) => {
  const b = await body(req);
  return done(await ops.saveStall({ ...b, public: bool(b.public) }, null));
});
on("PUT", "stalls/:id", async ({ req, params: [id] }) => {
  const b = await body(req);
  return done(await ops.saveStall({ ...b, public: bool(b.public) }, id));
});
on("DELETE", "stalls/:id", async ({ params: [id] }) => done(await ops.deleteStall(id)));

/** Everything stall mode needs to keep selling with no signal. */
on("GET", "stall-mode", async ({ store }) => {
  const [products, offers, stalls] = await Promise.all([store.listProducts({ includeHidden: true }), store.listOffers(), store.listStalls()]);
  // Anything with a price can be sold at the stall, even if it's hidden online.
  const sellable = products
    .filter((p) => p.pricePaise !== null && p.status !== "upcoming")
    .map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      image: p.images[0] ?? null,
      pricePaise: p.pricePaise!,
      options: p.options,
      stock: p.stock,
      hidden: p.status === "hidden",
    }));
  const today = istToday();
  return json({
    products: sellable,
    offers,
    stalls: stalls.filter((s) => s.date >= istToday(new Date(Date.now() - 7 * 86_400_000))).map((s) => ({ id: s.id, name: s.name, date: s.date })),
    today,
    fetchedAt: new Date().toISOString(),
  });
});
on("POST", "stall-sales", async ({ req, store }) => {
  const b = syncSchema.safeParse(await readJson(req));
  if (!b.success) return json({ error: "Send { sales: [...] } with 1 to 200 sales." }, 400);
  return json({ results: await syncStallSales(store, b.data.sales) });
});
on("DELETE", "stall-sales/:id", async ({ params: [id] }) => done(await ops.voidStallSale(id)));

// Blog, photo library, colleges -----------------------------------------

on("GET", "blog", async ({ store }) => json({ posts: await store.listPosts({ includeDrafts: true }) }));
on("GET", "blog/:id", async ({ store, params: [id] }) => {
  const post = await store.getPost(id);
  return post ? json({ post }) : notFound();
});
on("POST", "blog", async ({ req }) => done(await ops.savePost(await body(req), null)));
on("PUT", "blog/:id", async ({ req, params: [id] }) => done(await ops.savePost(await body(req), id)));
on("DELETE", "blog/:id", async ({ params: [id] }) => done(await ops.deletePost(id)));

on("GET", "gallery", async ({ store }) => {
  const [items, stalls, colleges] = await Promise.all([store.listGallery({ includeHidden: true }), store.listStalls(), store.listColleges({ includeHidden: true })]);
  return json({ items, stalls: stalls.map((s) => ({ id: s.id, name: s.name, date: s.date })), colleges: colleges.map((c) => ({ id: c.id, name: c.name })) });
});
on("POST", "gallery", async ({ req }) => {
  const b = await body(req);
  return done(await ops.addGallery({ ...b, visible: bool(b.visible) }));
});
on("PUT", "gallery/:id", async ({ req, params: [id] }) => {
  const b = await body(req);
  return done(await ops.saveGalleryItem({ ...b, id, visible: bool(b.visible) }));
});
on("DELETE", "gallery/:id", async ({ params: [id] }) => done(await ops.deleteGalleryItem(id)));

on("GET", "colleges", async ({ store }) => json({ colleges: await store.listColleges({ includeHidden: true }) }));
on("GET", "colleges/:id", async ({ store, params: [id] }) => {
  const college = await store.getCollege(id);
  return college ? json({ college }) : notFound();
});
on("POST", "colleges", async ({ req }) => done(await ops.saveCollege(await body(req), null)));
on("PUT", "colleges/:id", async ({ req, params: [id] }) => done(await ops.saveCollege(await body(req), id)));
on("DELETE", "colleges/:id", async ({ params: [id] }) => done(await ops.deleteCollege(id)));

// Entry points ----------------------------------------------------------

const loginSchema = z.object({ email: z.string().max(200), password: z.string().max(200) });

async function login(req: Request): Promise<Response> {
  if (!(await rateLimit("admin-login", 8, 15 * 60_000))) return json({ error: "Too many attempts. Wait 15 minutes." }, 429);
  const b = loginSchema.safeParse(await readJson(req));
  if (!b.success) return json({ error: "Send your email and password." }, 400);
  const res = await checkCredentials(b.data.email, b.data.password);
  if (!res.ok) return json({ error: res.error }, 401);
  await clearRateLimit("admin-login");
  const token = issueAppToken(res.email)!;
  return json({ ...token, email: res.email, mode: storeMode(), shopUrl: site.url });
}

/** Handles /api/app/admin/<parts>. */
export async function handle(req: Request, parts: string[]): Promise<Response> {
  const method = req.method.toUpperCase();
  if (parts.length === 1 && parts[0] === "login") return method === "POST" ? login(req) : json({ error: "Use POST." }, 405);

  if (!getAppAdmin(req)) return json({ error: "Log in again." }, 401);
  const store = getStoreOrNull();
  if (!store) return json({ error: "The shop database isn't configured yet." }, 503);

  let pathMatched = false;
  for (const r of routes) {
    const params = match(r.path, parts);
    if (!params) continue;
    pathMatched = true;
    if (r.method !== method) continue;
    try {
      return await r.handler({ req, store, params, url: new URL(req.url) });
    } catch (err) {
      console.error(`[app-api ${method} ${parts.join("/")}]`, err);
      return json({ error: "Something went wrong on the server. Try again." }, 500);
    }
  }
  return pathMatched ? json({ error: "Method not allowed." }, 405) : notFound();
}

/** Every route, for the API docs test. */
export const ROUTES = routes.map((r) => `${r.method} ${r.path}`);
