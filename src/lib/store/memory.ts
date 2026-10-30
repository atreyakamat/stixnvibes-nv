import type { BlogPost, College, Collection, Coupon, CustomRequest, GalleryItem, Offer, Order, Product, Review, Settings, Stall, StallSale, Stats, Upload } from "@/lib/types";
import { DEMO_SETTINGS, demoColleges, demoCoupons, demoGallery, demoPosts, demoProducts, demoReviews, demoStallSales, demoStalls, seedCollections, seedOffers } from "./seed";
import type {
  CollectionInput,
  CollegeInput,
  CouponInput,
  CustomRequestPatch,
  GalleryInput,
  NewCustomRequest,
  NewOrder,
  NewReview,
  NewStallSale,
  OfferInput,
  OrderFilter,
  OrderPatch,
  PostInput,
  ProductInput,
  ReviewFilter,
  ReviewPatch,
  StallInput,
  StallSaleFilter,
  Store,
  TrackEvent,
} from "./types";

type StoredEvent = TrackEvent & { at: string };

type State = {
  products: Product[];
  collections: Collection[];
  offers: Offer[];
  orders: Order[];
  coupons: Coupon[];
  customRequests: CustomRequest[];
  uploads: Map<string, Upload & { body: Buffer }>;
  events: StoredEvent[];
  settings: Settings;
  stalls: Stall[];
  stallSales: StallSale[];
  posts: BlogPost[];
  gallery: GalleryItem[];
  colleges: College[];
  reviews: Review[];
};

const MAX_DEMO_FILE = 1.5 * 1024 * 1024;

const clone = <T,>(v: T): T => structuredClone(v);
const now = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

async function toDataUrl(file: File): Promise<string> {
  if (file.size > MAX_DEMO_FILE) throw new Error("Preview mode keeps photos in memory, so the limit is 1.5 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buf.toString("base64")}`;
}

export const EMPTY_STATS: Stats = {
  visits: 0,
  views: 0,
  addToCart: 0,
  checkouts: 0,
  orderClicks: 0,
  askClicks: 0,
  orders: 0,
  orderValuePaise: 0,
  sales: 0,
  salesPaise: 0,
  paid: 0,
  topViewed: [],
  topOrdered: [],
  byType: [],
  bySource: [],
  byCoupon: [],
  daily: [],
};

const SOLD: Order["status"][] = ["confirmed", "paid", "shipped", "done"];

/** Same numbers as the shop_stats SQL function, for the in-memory store. */
export function computeStats(events: StoredEvent[], orders: Order[], sinceIso: string): Stats {
  const ev = events.filter((e) => e.at >= sinceIso);
  const ord = orders.filter((o) => o.createdAt >= sinceIso && o.status !== "cancelled");
  const sold = ord.filter((o) => SOLD.includes(o.status));
  const count = (t: TrackEvent["type"]) => ev.filter((e) => e.type === t).length;
  const sum = (list: Order[]) => list.reduce((n, o) => n + o.totalPaise, 0);

  const viewed = new Map<string, number>();
  for (const e of ev) if (e.type === "view" && e.productId) viewed.set(e.productId, (viewed.get(e.productId) ?? 0) + 1);
  const ordered = new Map<string, number>();
  for (const o of ord) for (const l of o.lines) ordered.set(l.productId, (ordered.get(l.productId) ?? 0) + l.qty);

  const byType = new Map<string, { qty: number; paise: number }>();
  for (const o of sold)
    for (const l of o.lines) {
      const t = byType.get(l.type) ?? byType.set(l.type, { qty: 0, paise: 0 }).get(l.type)!;
      t.qty += l.qty;
      t.paise += l.lineTotalPaise;
    }

  type Src = { visits: number | null; orders: number | null; sales: number | null; salesPaise: number | null };
  const bySource = new Map<string, Src>();
  const src = (s: string | undefined) => {
    const k = s || "direct";
    return bySource.get(k) ?? bySource.set(k, { visits: null, orders: null, sales: null, salesPaise: null }).get(k)!;
  };
  for (const e of ev) if (e.type === "visit") src(e.source).visits = (src(e.source).visits ?? 0) + 1;
  for (const o of ord) src(o.source).orders = (src(o.source).orders ?? 0) + 1;
  for (const o of sold) {
    const x = src(o.source);
    x.sales = (x.sales ?? 0) + 1;
    x.salesPaise = (x.salesPaise ?? 0) + o.totalPaise;
  }

  const byCoupon = new Map<string, Stats["byCoupon"][number]>();
  for (const o of ord) {
    if (!o.couponCode) continue;
    const c = byCoupon.get(o.couponCode) ?? byCoupon.set(o.couponCode, { code: o.couponCode, orders: 0, sales: 0, salesPaise: 0, discountPaise: 0 }).get(o.couponCode)!;
    c.orders++;
    c.discountPaise += o.offers.filter((a) => a.offerId === `coupon:${o.couponCode}`).reduce((n, a) => n + a.discountPaise, 0);
    if (SOLD.includes(o.status)) {
      c.sales++;
      c.salesPaise += o.totalPaise;
    }
  }

  const days = new Map<string, { views: number; visits: number; orders: number; salesPaise: number }>();
  const day = (iso: string) => {
    const d = iso.slice(0, 10);
    return days.get(d) ?? days.set(d, { views: 0, visits: 0, orders: 0, salesPaise: 0 }).get(d)!;
  };
  for (const e of ev) {
    if (e.type === "view") day(e.at).views++;
    if (e.type === "visit") day(e.at).visits++;
  }
  for (const o of ord) day(o.createdAt).orders++;
  for (const o of sold) day(o.createdAt).salesPaise += o.totalPaise;

  return {
    visits: count("visit"),
    views: count("view"),
    addToCart: count("add_to_cart"),
    checkouts: count("checkout"),
    orderClicks: count("order_click"),
    askClicks: count("ask_click"),
    orders: ord.length,
    orderValuePaise: sum(ord),
    sales: sold.length,
    salesPaise: sum(sold),
    paid: ord.filter((o) => ["paid", "shipped", "done"].includes(o.status)).length,
    topViewed: [...viewed].map(([productId, c]) => ({ productId, count: c })).sort((a, b) => b.count - a.count).slice(0, 8),
    topOrdered: [...ordered].map(([productId, qty]) => ({ productId, qty })).sort((a, b) => b.qty - a.qty).slice(0, 8),
    byType: [...byType].map(([type, v]) => ({ type, ...v })).sort((a, b) => b.paise - a.paise),
    bySource: [...bySource]
      .map(([source, v]) => ({ source, ...v }))
      .sort((a, b) => (b.salesPaise ?? 0) - (a.salesPaise ?? 0) || (b.visits ?? 0) - (a.visits ?? 0)),
    byCoupon: [...byCoupon.values()].sort((a, b) => b.orders - a.orders),
    daily: [...days].map(([d, v]) => ({ day: d, ...v })).sort((a, b) => a.day.localeCompare(b.day)),
  };
}

const sortProducts = (a: Product, b: Product) =>
  Number(b.featured) - Number(a.featured) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);

/**
 * In-memory store for local dev, tests and Netlify previews. Data lives as
 * long as the server process, so previews reset now and then; that's fine
 * for trying things out and the reason it never runs in production.
 */
export class MemoryStore implements Store {
  readonly mode = "demo" as const;
  private s: State;

  constructor(initial?: Partial<State>) {
    this.s = {
      products: initial?.products ?? demoProducts(),
      collections: initial?.collections ?? seedCollections(),
      offers: initial?.offers ?? seedOffers(),
      orders: initial?.orders ?? [],
      coupons: initial?.coupons ?? demoCoupons(),
      customRequests: initial?.customRequests ?? [],
      uploads: initial?.uploads ?? new Map(),
      events: initial?.events ?? [],
      settings: initial?.settings ?? { ...DEMO_SETTINGS },
      stalls: initial?.stalls ?? demoStalls(),
      stallSales: initial?.stallSales ?? demoStallSales(),
      posts: initial?.posts ?? demoPosts(),
      gallery: initial?.gallery ?? demoGallery(),
      colleges: initial?.colleges ?? demoColleges(),
      reviews: initial?.reviews ?? (initial?.products ? [] : demoReviews(demoProducts())),
    };
  }

  // Products ------------------------------------------------------------

  async listProducts(opts?: { includeHidden?: boolean }) {
    return clone(this.s.products.filter((p) => opts?.includeHidden || p.status !== "hidden").sort(sortProducts));
  }

  async getProduct(id: string) {
    const p = this.s.products.find((x) => x.id === id);
    return p ? clone(p) : null;
  }

  private assertSlugFree<T extends { id: string; slug: string }>(list: T[], slug: string, exceptId?: string) {
    if (list.some((p) => p.slug === slug && p.id !== exceptId)) throw new Error(`The link "${slug}" is already used.`);
  }

  async createProduct(input: ProductInput) {
    this.assertSlugFree(this.s.products, input.slug);
    const product: Product = { ...clone(input), id: uid("p"), createdAt: now(), updatedAt: now() };
    this.s.products.push(product);
    return clone(product);
  }

  async updateProduct(id: string, input: ProductInput) {
    const i = this.s.products.findIndex((p) => p.id === id);
    if (i < 0) throw new Error("Product not found");
    this.assertSlugFree(this.s.products, input.slug, id);
    this.s.products[i] = { ...this.s.products[i], ...clone(input), updatedAt: now() };
    return clone(this.s.products[i]);
  }

  async deleteProduct(id: string) {
    this.s.products = this.s.products.filter((p) => p.id !== id);
    this.s.reviews = this.s.reviews.filter((r) => r.productId !== id);
  }

  async uploadProductImage(file: File) {
    return toDataUrl(file);
  }

  // Collections ---------------------------------------------------------

  async listCollections(opts?: { includeHidden?: boolean }) {
    return clone(
      this.s.collections
        .filter((c) => opts?.includeHidden || c.active)
        .sort((a, b) => Number(b.featured) - Number(a.featured) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    );
  }

  async getCollection(id: string) {
    const c = this.s.collections.find((x) => x.id === id);
    return c ? clone(c) : null;
  }

  async createCollection(input: CollectionInput) {
    this.assertSlugFree(this.s.collections, input.slug);
    const c: Collection = { ...clone(input), id: uid("c"), createdAt: now() };
    this.s.collections.push(c);
    return clone(c);
  }

  async updateCollection(id: string, input: CollectionInput) {
    const i = this.s.collections.findIndex((c) => c.id === id);
    if (i < 0) throw new Error("Collection not found");
    this.assertSlugFree(this.s.collections, input.slug, id);
    this.s.collections[i] = { ...this.s.collections[i], ...clone(input) };
    return clone(this.s.collections[i]);
  }

  async deleteCollection(id: string) {
    this.s.collections = this.s.collections.filter((c) => c.id !== id);
    for (const p of this.s.products) p.collectionIds = p.collectionIds.filter((c) => c !== id);
  }

  // Offers --------------------------------------------------------------

  async listOffers(opts?: { includeInactive?: boolean }) {
    return clone(this.s.offers.filter((o) => opts?.includeInactive || o.active).sort((a, b) => a.sortOrder - b.sortOrder));
  }

  async saveOffer(id: string | null, input: OfferInput) {
    if (id) {
      const i = this.s.offers.findIndex((o) => o.id === id);
      if (i < 0) throw new Error("Offer not found");
      this.s.offers[i] = { ...clone(input), id };
      return clone(this.s.offers[i]);
    }
    const o: Offer = { ...clone(input), id: uid("o") };
    this.s.offers.push(o);
    return clone(o);
  }

  async deleteOffer(id: string) {
    this.s.offers = this.s.offers.filter((o) => o.id !== id);
  }

  // Orders --------------------------------------------------------------

  async createOrder(input: NewOrder) {
    if (this.s.orders.some((o) => o.number === input.number)) throw new Error("duplicate order number");
    const order: Order = { ...clone(input), id: uid("o"), status: "new", adminNote: "", stockTaken: false, trackingNumber: "", createdAt: now(), updatedAt: now() };
    this.s.orders.unshift(order);
    return clone(order);
  }

  async getOrder(number: string) {
    const o = this.s.orders.find((x) => x.number === number);
    return o ? clone(o) : null;
  }

  async listOrders(filter?: OrderFilter) {
    const q = filter?.search?.trim().toLowerCase();
    return clone(
      this.s.orders
        .filter((o) => !filter?.status || o.status === filter.status)
        .filter((o) => !q || o.number.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || o.customerPhone.includes(q))
        .filter((o) => !filter?.updatedSince || o.updatedAt > filter.updatedSince)
        .filter((o) => !filter?.createdSince || o.createdAt >= filter.createdSince)
        .sort((a, b) => (filter?.updatedSince ? a.updatedAt.localeCompare(b.updatedAt) : 0))
        .slice(0, filter?.limit ?? 200),
    );
  }

  async updateOrder(number: string, patch: OrderPatch) {
    const o = this.s.orders.find((x) => x.number === number);
    if (!o) throw new Error("Order not found");
    Object.assign(o, patch, { updatedAt: now() });
    return clone(o);
  }

  async moveStock(number: string, sign: -1 | 1) {
    const o = this.s.orders.find((x) => x.number === number);
    if (!o || o.stockTaken === (sign === -1)) return;
    o.stockTaken = sign === -1;
    this.adjustStock(o.lines, sign);
  }

  private adjustStock(lines: { productId: string; qty: number }[], sign: -1 | 1) {
    for (const l of lines) {
      const p = this.s.products.find((x) => x.id === l.productId);
      if (p && p.stock !== null) p.stock = Math.max(0, p.stock + sign * l.qty);
    }
  }

  // Coupons -------------------------------------------------------------

  async listCoupons() {
    return clone([...this.s.coupons].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }

  async getCoupon(code: string) {
    const c = this.s.coupons.find((x) => x.code === code);
    return c ? clone(c) : null;
  }

  async saveCoupon(input: CouponInput, isNew: boolean) {
    const i = this.s.coupons.findIndex((c) => c.code === input.code);
    if (isNew && i >= 0) throw new Error(`The code ${input.code} already exists.`);
    if (!isNew && i < 0) throw new Error("Code not found");
    const c: Coupon = { ...clone(input), createdAt: i >= 0 ? this.s.coupons[i].createdAt : now() };
    if (i >= 0) this.s.coupons[i] = c;
    else this.s.coupons.push(c);
    return clone(c);
  }

  async deleteCoupon(code: string) {
    this.s.coupons = this.s.coupons.filter((c) => c.code !== code);
  }

  async couponUses(code: string) {
    return this.s.orders.filter((o) => o.couponCode === code && o.status !== "cancelled").length;
  }

  // Custom requests -----------------------------------------------------

  async createCustomRequest(input: NewCustomRequest) {
    if (this.s.customRequests.some((c) => c.number === input.number)) throw new Error("duplicate request number");
    const c: CustomRequest = { ...clone(input), id: uid("cr"), status: "new", adminNote: "", createdAt: now(), updatedAt: now() };
    this.s.customRequests.unshift(c);
    return clone(c);
  }

  async getCustomRequest(number: string) {
    const c = this.s.customRequests.find((x) => x.number === number);
    return c ? clone(c) : null;
  }

  async listCustomRequests(limit = 200) {
    return clone(this.s.customRequests.slice(0, limit));
  }

  async updateCustomRequest(number: string, patch: CustomRequestPatch) {
    const c = this.s.customRequests.find((x) => x.number === number);
    if (!c) throw new Error("Request not found");
    Object.assign(c, patch, { updatedAt: now() });
    return clone(c);
  }

  // Uploads, analytics, settings ---------------------------------------

  async saveUpload(id: string, file: File) {
    if (file.size > MAX_DEMO_FILE) throw new Error("Preview mode keeps photos in memory, so the limit is 1.5 MB.");
    const upload = { id, path: id, contentType: file.type, body: Buffer.from(await file.arrayBuffer()) };
    this.s.uploads.set(id, upload);
    if (this.s.uploads.size > 200) this.s.uploads.delete(this.s.uploads.keys().next().value!);
    return { id, path: id, contentType: file.type };
  }

  async readUpload(id: string) {
    const u = this.s.uploads.get(id);
    return u ? { body: u.body, contentType: u.contentType } : null;
  }

  async track(events: TrackEvent[]) {
    const at = now();
    this.s.events.push(...events.map((e) => ({ ...e, at })));
    if (this.s.events.length > 20000) this.s.events.splice(0, 5000);
  }

  async stats(sinceIso: string) {
    return computeStats(this.s.events, this.s.orders, sinceIso);
  }

  async getSettings() {
    return clone(this.s.settings);
  }

  async saveSettings(settings: Settings) {
    this.s.settings = clone(settings);
  }

  // Stalls ----------------------------------------------------------------

  async listStalls() {
    return clone([...this.s.stalls].sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name)));
  }

  async getStall(id: string) {
    const st = this.s.stalls.find((x) => x.id === id);
    return st ? clone(st) : null;
  }

  async saveStall(id: string | null, input: StallInput) {
    if (id) {
      const i = this.s.stalls.findIndex((x) => x.id === id);
      if (i < 0) throw new Error("Stall not found");
      this.s.stalls[i] = { ...this.s.stalls[i], ...clone(input) };
      return clone(this.s.stalls[i]);
    }
    const st: Stall = { ...clone(input), id: uid("st"), createdAt: now() };
    this.s.stalls.push(st);
    return clone(st);
  }

  async deleteStall(id: string) {
    this.s.stalls = this.s.stalls.filter((x) => x.id !== id);
    for (const x of this.s.stallSales) if (x.stallId === id) x.stallId = null;
    for (const g of this.s.gallery) if (g.stallId === id) g.stallId = null;
  }

  async recordStallSale(input: NewStallSale) {
    const existing = this.s.stallSales.find((x) => x.id === input.id);
    if (existing) return { sale: clone(existing), created: false };
    const sale: StallSale = { ...clone(input), createdAt: now() };
    this.s.stallSales.unshift(sale);
    this.adjustStock(sale.lines, -1);
    return { sale: clone(sale), created: true };
  }

  async listStallSales(filter?: StallSaleFilter) {
    return clone(
      this.s.stallSales
        .filter((x) => !filter?.stallId || x.stallId === filter.stallId)
        .filter((x) => !filter?.since || x.soldAt >= filter.since)
        .sort((a, b) => b.soldAt.localeCompare(a.soldAt))
        .slice(0, filter?.limit ?? 5000),
    );
  }

  async voidStallSale(id: string) {
    const sale = this.s.stallSales.find((x) => x.id === id);
    if (!sale) return;
    this.s.stallSales = this.s.stallSales.filter((x) => x.id !== id);
    this.adjustStock(sale.lines, 1);
  }

  // Blog, gallery, colleges -------------------------------------------------

  async listPosts(opts?: { includeDrafts?: boolean }) {
    return clone(
      this.s.posts
        .filter((p) => opts?.includeDrafts || p.status === "published")
        .sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt)),
    );
  }

  async getPost(id: string) {
    const p = this.s.posts.find((x) => x.id === id);
    return p ? clone(p) : null;
  }

  async savePost(id: string | null, input: PostInput) {
    this.assertSlugFree(this.s.posts, input.slug, id ?? undefined);
    if (id) {
      const i = this.s.posts.findIndex((x) => x.id === id);
      if (i < 0) throw new Error("Post not found");
      this.s.posts[i] = { ...this.s.posts[i], ...clone(input), updatedAt: now() };
      return clone(this.s.posts[i]);
    }
    const p: BlogPost = { ...clone(input), id: uid("post"), createdAt: now(), updatedAt: now() };
    this.s.posts.push(p);
    return clone(p);
  }

  async deletePost(id: string) {
    this.s.posts = this.s.posts.filter((x) => x.id !== id);
  }

  async listGallery(opts?: { includeHidden?: boolean }) {
    return clone(
      this.s.gallery.filter((g) => opts?.includeHidden || g.visible).sort((a, b) => a.sortOrder - b.sortOrder || b.createdAt.localeCompare(a.createdAt)),
    );
  }

  async saveGalleryItem(id: string | null, input: GalleryInput) {
    if (id) {
      const i = this.s.gallery.findIndex((x) => x.id === id);
      if (i < 0) throw new Error("Photo not found");
      this.s.gallery[i] = { ...this.s.gallery[i], ...clone(input) };
      return clone(this.s.gallery[i]);
    }
    const g: GalleryItem = { ...clone(input), id: uid("g"), createdAt: now() };
    this.s.gallery.push(g);
    return clone(g);
  }

  async deleteGalleryItem(id: string) {
    this.s.gallery = this.s.gallery.filter((x) => x.id !== id);
  }

  async listColleges(opts?: { includeHidden?: boolean }) {
    return clone(this.s.colleges.filter((c) => opts?.includeHidden || c.active).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)));
  }

  async getCollege(id: string) {
    const c = this.s.colleges.find((x) => x.id === id);
    return c ? clone(c) : null;
  }

  async saveCollege(id: string | null, input: CollegeInput) {
    this.assertSlugFree(this.s.colleges, input.slug, id ?? undefined);
    if (id) {
      const i = this.s.colleges.findIndex((x) => x.id === id);
      if (i < 0) throw new Error("College not found");
      this.s.colleges[i] = { ...this.s.colleges[i], ...clone(input) };
      return clone(this.s.colleges[i]);
    }
    const c: College = { ...clone(input), id: uid("col"), createdAt: now() };
    this.s.colleges.push(c);
    return clone(c);
  }

  async deleteCollege(id: string) {
    this.s.colleges = this.s.colleges.filter((x) => x.id !== id);
    for (const st of this.s.stalls) if (st.collegeId === id) st.collegeId = null;
    for (const g of this.s.gallery) if (g.collegeId === id) g.collegeId = null;
  }

  // Reviews -------------------------------------------------------------

  async listReviews(filter?: ReviewFilter) {
    const list = this.s.reviews
      .filter((r) => (!filter?.status || r.status === filter.status) && (!filter?.productId || r.productId === filter.productId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return clone(list.slice(0, filter?.limit ?? 500));
  }

  async getReview(id: string) {
    const r = this.s.reviews.find((x) => x.id === id);
    return r ? clone(r) : null;
  }

  async createReview(input: NewReview) {
    if (input.orderNumber && this.s.reviews.some((r) => r.orderNumber === input.orderNumber && r.productId === input.productId)) {
      throw new Error("This order already has a review for that product.");
    }
    const r: Review = { ...clone(input), id: uid("rev"), status: "pending", reply: "", repliedAt: null, createdAt: now(), updatedAt: now() };
    this.s.reviews.push(r);
    return clone(r);
  }

  async updateReview(id: string, patch: ReviewPatch) {
    const r = this.s.reviews.find((x) => x.id === id);
    if (!r) throw new Error("Review not found");
    if (patch.status) r.status = patch.status;
    if (patch.reply !== undefined && patch.reply !== r.reply) {
      r.reply = patch.reply;
      r.repliedAt = patch.reply ? now() : null;
    }
    r.updatedAt = now();
    return clone(r);
  }

  async deleteReview(id: string) {
    this.s.reviews = this.s.reviews.filter((x) => x.id !== id);
  }

  async exportAll() {
    // Uploaded files and analytics stay out, as in the Supabase export.
    return clone(Object.fromEntries(Object.entries(this.s).filter(([k]) => k !== "uploads" && k !== "events")));
  }
}
