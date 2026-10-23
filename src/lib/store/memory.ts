import type { Collection, Offer, Order, Product, Settings, Stats, Upload } from "@/lib/types";
import { DEMO_SETTINGS, demoProducts, seedCollections, seedOffers } from "./seed";
import type { CollectionInput, NewOrder, OfferInput, OrderFilter, OrderPatch, ProductInput, Store, TrackEvent } from "./types";

type StoredEvent = TrackEvent & { at: string };

type State = {
  products: Product[];
  collections: Collection[];
  offers: Offer[];
  orders: Order[];
  uploads: Map<string, Upload & { body: Buffer }>;
  events: StoredEvent[];
  settings: Settings;
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

export function computeStats(events: StoredEvent[], orders: Order[], sinceIso: string): Stats {
  const ev = events.filter((e) => e.at >= sinceIso);
  const ord = orders.filter((o) => o.createdAt >= sinceIso && o.status !== "cancelled");
  const count = (t: TrackEvent["type"]) => ev.filter((e) => e.type === t).length;

  const viewed = new Map<string, number>();
  for (const e of ev) if (e.type === "view" && e.productId) viewed.set(e.productId, (viewed.get(e.productId) ?? 0) + 1);
  const ordered = new Map<string, number>();
  for (const o of ord) for (const l of o.lines) ordered.set(l.productId, (ordered.get(l.productId) ?? 0) + l.qty);

  const days = new Map<string, { views: number; orders: number }>();
  const day = (iso: string) => iso.slice(0, 10);
  for (const e of ev) if (e.type === "view") (days.get(day(e.at)) ?? days.set(day(e.at), { views: 0, orders: 0 }).get(day(e.at))!).views++;
  for (const o of ord) (days.get(day(o.createdAt)) ?? days.set(day(o.createdAt), { views: 0, orders: 0 }).get(day(o.createdAt))!).orders++;

  return {
    views: count("view"),
    addToCart: count("add_to_cart"),
    orderClicks: count("order_click"),
    askClicks: count("ask_click"),
    orders: ord.length,
    orderValuePaise: ord.reduce((n, o) => n + o.totalPaise, 0),
    topViewed: [...viewed].map(([productId, c]) => ({ productId, count: c })).sort((a, b) => b.count - a.count).slice(0, 8),
    topOrdered: [...ordered].map(([productId, qty]) => ({ productId, qty })).sort((a, b) => b.qty - a.qty).slice(0, 8),
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
      uploads: initial?.uploads ?? new Map(),
      events: initial?.events ?? [],
      settings: initial?.settings ?? { ...DEMO_SETTINGS },
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
    const order: Order = { ...clone(input), id: uid("o"), status: "new", adminNote: "", createdAt: now(), updatedAt: now() };
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
        .filter((o) => !q || o.number.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q))
        .slice(0, filter?.limit ?? 200),
    );
  }

  async updateOrder(number: string, patch: OrderPatch) {
    const o = this.s.orders.find((x) => x.number === number);
    if (!o) throw new Error("Order not found");
    Object.assign(o, patch, { updatedAt: now() });
    return clone(o);
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
}
