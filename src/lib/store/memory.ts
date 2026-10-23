import type { CustomRequest, Order, OrderItem, Product, Settings } from "@/lib/types";
import { demoProducts, DEMO_SETTINGS } from "./seed";
import { OutOfStockError, type NewOrder, type OrderFilter, type OrderPatch, type ProductInput, type Store } from "./types";

type State = {
  products: Product[];
  orders: Order[];
  custom: CustomRequest[];
  settings: Settings;
};

const MAX_DEMO_FILE = 1.5 * 1024 * 1024;

const clone = <T,>(v: T): T => structuredClone(v);
const now = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

async function toDataUrl(file: File): Promise<string> {
  if (file.size > MAX_DEMO_FILE) throw new Error("Demo mode keeps files in memory, so the limit is 1.5 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buf.toString("base64")}`;
}

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
      orders: initial?.orders ?? [],
      custom: initial?.custom ?? [],
      settings: initial?.settings ?? { ...DEMO_SETTINGS },
    };
  }

  async listProducts(opts?: { includeInactive?: boolean }) {
    return clone(
      this.s.products
        .filter((p) => opts?.includeInactive || p.active)
        .sort((a, b) => Number(b.featured) - Number(a.featured) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    );
  }

  async getProductBySlug(slug: string) {
    const p = this.s.products.find((x) => x.slug === slug);
    return p ? clone(p) : null;
  }

  async getProduct(id: string) {
    const p = this.s.products.find((x) => x.id === id);
    return p ? clone(p) : null;
  }

  private assertSlugFree(slug: string, exceptId?: string) {
    if (this.s.products.some((p) => p.slug === slug && p.id !== exceptId)) {
      throw new Error(`Another product already uses the link "${slug}".`);
    }
  }

  async createProduct(input: ProductInput) {
    this.assertSlugFree(input.slug);
    const product: Product = {
      ...clone(input),
      id: uid("p"),
      variants: input.variants.map((v) => ({ ...v, id: v.id ?? uid("v") })),
      createdAt: now(),
      updatedAt: now(),
    };
    this.s.products.push(product);
    return clone(product);
  }

  async updateProduct(id: string, input: ProductInput) {
    const i = this.s.products.findIndex((p) => p.id === id);
    if (i < 0) throw new Error("Product not found");
    this.assertSlugFree(input.slug, id);
    const product: Product = {
      ...this.s.products[i],
      ...clone(input),
      variants: input.variants.map((v) => ({ ...v, id: v.id ?? uid("v") })),
      updatedAt: now(),
    };
    this.s.products[i] = product;
    return clone(product);
  }

  async deleteProduct(id: string) {
    this.s.products = this.s.products.filter((p) => p.id !== id);
  }

  async uploadProductImage(file: File) {
    return toDataUrl(file);
  }

  async placeOrder(input: NewOrder) {
    const items = input.items;
    if (this.s.orders.some((o) => o.number === input.number)) throw new Error("duplicate order number");
    // Check every line first so a failure takes no stock at all.
    for (const item of items) {
      const v = this.findVariant(item.variantId);
      if (!v || (v.stock !== null && v.stock < item.qty)) throw new OutOfStockError(item.variantId);
    }
    for (const item of items) {
      const v = this.findVariant(item.variantId)!;
      if (v.stock !== null) v.stock -= item.qty;
    }
    const order: Order = { ...clone(input), id: uid("o"), createdAt: now(), updatedAt: now() };
    this.s.orders.unshift(order);
    return clone(order);
  }

  private findVariant(variantId: string) {
    for (const p of this.s.products) {
      const v = p.variants.find((x) => x.id === variantId);
      if (v) return v;
    }
    return null;
  }

  async getOrderByNumber(number: string) {
    const o = this.s.orders.find((x) => x.number === number);
    return o ? clone(o) : null;
  }

  async listOrders(filter?: OrderFilter) {
    const q = filter?.search?.trim().toLowerCase();
    return clone(
      this.s.orders
        .filter((o) => !filter?.status || o.status === filter.status)
        .filter(
          (o) =>
            !q ||
            o.number.toLowerCase().includes(q) ||
            o.customer.name.toLowerCase().includes(q) ||
            o.customer.phone.includes(q),
        )
        .slice(0, filter?.limit ?? 200),
    );
  }

  async updateOrder(number: string, patch: OrderPatch) {
    const o = this.s.orders.find((x) => x.number === number);
    if (!o) throw new Error("Order not found");
    const { event, ...fields } = patch;
    if (fields.utr && this.s.orders.some((x) => x.utr === fields.utr && x.number !== number)) {
      throw new Error("That UPI reference is already attached to another order.");
    }
    Object.assign(o, fields, { updatedAt: now() });
    if (event) o.events.push(event);
    return clone(o);
  }

  async restock(items: OrderItem[]) {
    for (const item of items) {
      const v = this.findVariant(item.variantId);
      if (v && v.stock !== null) v.stock += item.qty;
    }
  }

  async createCustomRequest(input: Omit<CustomRequest, "id" | "createdAt" | "status" | "adminNote" | "file">, file: File | null) {
    const req: CustomRequest = {
      ...input,
      id: uid("c"),
      file: file ? await toDataUrl(file) : null,
      status: "new",
      adminNote: "",
      createdAt: now(),
    };
    this.s.custom.unshift(req);
    return clone(req);
  }

  async listCustomRequests() {
    return clone(this.s.custom);
  }

  async updateCustomRequest(id: string, patch: { status?: CustomRequest["status"]; adminNote?: string }) {
    const r = this.s.custom.find((x) => x.id === id);
    if (!r) throw new Error("Request not found");
    Object.assign(r, patch);
  }

  async customFileUrl(file: string) {
    return file;
  }

  async getSettings() {
    return clone(this.s.settings);
  }

  async saveSettings(settings: Settings) {
    this.s.settings = clone(settings);
  }
}
