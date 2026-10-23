import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Collection, Offer, Order, Product, Settings, Stats } from "@/lib/types";
import { DEFAULT_SETTINGS } from "./seed";
import type { CollectionInput, NewOrder, OfferInput, OrderFilter, OrderPatch, ProductInput, Store, TrackEvent } from "./types";

type Row = Record<string, unknown>;

function toProduct(r: Row): Product {
  return {
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    type: r.type as Product["type"],
    collectionIds: (r.collection_ids as string[]) ?? [],
    description: r.description as string,
    details: r.details as string,
    images: (r.images as string[]) ?? [],
    tags: (r.tags as string[]) ?? [],
    status: r.status as Product["status"],
    featured: r.featured as boolean,
    soldOut: r.sold_out as boolean,
    badge: (r.badge as string) ?? "",
    sortOrder: r.sort_order as number,
    pricePaise: (r.price_paise as number | null) ?? null,
    compareAtPaise: (r.compare_at_paise as number | null) ?? null,
    minQty: (r.min_qty as number) ?? 1,
    options: (r.options as Product["options"]) ?? [],
    customFields: (r.custom_fields as Product["customFields"]) ?? [],
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function productRow(p: ProductInput): Row {
  return {
    slug: p.slug,
    name: p.name,
    type: p.type,
    collection_ids: p.collectionIds,
    description: p.description,
    details: p.details,
    images: p.images,
    tags: p.tags,
    status: p.status,
    featured: p.featured,
    sold_out: p.soldOut,
    badge: p.badge,
    sort_order: p.sortOrder,
    price_paise: p.pricePaise,
    compare_at_paise: p.compareAtPaise,
    min_qty: p.minQty,
    options: p.options,
    custom_fields: p.customFields,
    updated_at: new Date().toISOString(),
  };
}

function toCollection(r: Row): Collection {
  return {
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    description: r.description as string,
    image: (r.image as string) ?? "",
    active: r.active as boolean,
    featured: r.featured as boolean,
    sortOrder: r.sort_order as number,
    createdAt: r.created_at as string,
  };
}

function toOffer(r: Row): Offer {
  return {
    id: r.id as string,
    kind: (r.kind as Offer["kind"]) ?? "bxgy",
    name: r.name as string,
    description: r.description as string,
    pricePaise: (r.price_paise as number | null) ?? null,
    productType: (r.product_type as Offer["productType"]) ?? null,
    buy: r.buy as number,
    free: r.free as number,
    active: r.active as boolean,
    sortOrder: r.sort_order as number,
  };
}

function toOrder(r: Row): Order {
  return {
    id: r.id as string,
    number: r.number as string,
    status: r.status as Order["status"],
    customerName: r.customer_name as string,
    customerNote: r.customer_note as string,
    lines: r.lines as Order["lines"],
    subtotalPaise: r.subtotal_paise as number,
    discountPaise: r.discount_paise as number,
    totalPaise: r.total_paise as number,
    offers: (r.offers as Order["offers"]) ?? [],
    adminNote: r.admin_note as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) {
    if (res.error.code === "23505") throw new Error("That link name is already used. Pick another.");
    throw new Error(res.error.message);
  }
  return res.data;
}

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export class SupabaseStore implements Store {
  readonly mode = "supabase" as const;
  private db: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  // Products ------------------------------------------------------------

  async listProducts(opts?: { includeHidden?: boolean }) {
    let q = this.db.from("products").select("*").order("featured", { ascending: false }).order("sort_order").order("name");
    if (!opts?.includeHidden) q = q.neq("status", "hidden");
    return (check(await q) as Row[]).map(toProduct);
  }

  async getProduct(id: string) {
    const data = check(await this.db.from("products").select("*").eq("id", id).maybeSingle());
    return data ? toProduct(data as Row) : null;
  }

  async createProduct(input: ProductInput) {
    return toProduct(check(await this.db.from("products").insert(productRow(input)).select("*").single()) as Row);
  }

  async updateProduct(id: string, input: ProductInput) {
    return toProduct(check(await this.db.from("products").update(productRow(input)).eq("id", id).select("*").single()) as Row);
  }

  async deleteProduct(id: string) {
    check(await this.db.from("products").delete().eq("id", id));
  }

  async uploadProductImage(file: File) {
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${EXT[file.type] ?? "bin"}`;
    check(await this.db.storage.from("product-images").upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false }));
    return this.db.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  }

  // Collections ---------------------------------------------------------

  async listCollections(opts?: { includeHidden?: boolean }) {
    let q = this.db.from("collections").select("*").order("featured", { ascending: false }).order("sort_order").order("name");
    if (!opts?.includeHidden) q = q.eq("active", true);
    return (check(await q) as Row[]).map(toCollection);
  }

  async getCollection(id: string) {
    const data = check(await this.db.from("collections").select("*").eq("id", id).maybeSingle());
    return data ? toCollection(data as Row) : null;
  }

  private collectionRow(c: CollectionInput): Row {
    return { slug: c.slug, name: c.name, description: c.description, image: c.image, active: c.active, featured: c.featured, sort_order: c.sortOrder };
  }

  async createCollection(input: CollectionInput) {
    return toCollection(check(await this.db.from("collections").insert(this.collectionRow(input)).select("*").single()) as Row);
  }

  async updateCollection(id: string, input: CollectionInput) {
    return toCollection(check(await this.db.from("collections").update(this.collectionRow(input)).eq("id", id).select("*").single()) as Row);
  }

  async deleteCollection(id: string) {
    check(await this.db.rpc("delete_collection", { p_id: id }));
  }

  // Offers --------------------------------------------------------------

  async listOffers(opts?: { includeInactive?: boolean }) {
    let q = this.db.from("offers").select("*").order("sort_order");
    if (!opts?.includeInactive) q = q.eq("active", true);
    return (check(await q) as Row[]).map(toOffer);
  }

  async saveOffer(id: string | null, o: OfferInput) {
    const row = {
      kind: o.kind,
      name: o.name,
      description: o.description,
      product_type: o.productType,
      buy: o.buy,
      free: o.free,
      price_paise: o.pricePaise,
      active: o.active,
      sort_order: o.sortOrder,
    };
    const res = id ? await this.db.from("offers").update(row).eq("id", id).select("*").single() : await this.db.from("offers").insert(row).select("*").single();
    return toOffer(check(res) as Row);
  }

  async deleteOffer(id: string) {
    check(await this.db.from("offers").delete().eq("id", id));
  }

  // Orders --------------------------------------------------------------

  async createOrder(o: NewOrder) {
    const row = {
      number: o.number,
      customer_name: o.customerName,
      customer_note: o.customerNote,
      lines: o.lines,
      subtotal_paise: o.subtotalPaise,
      discount_paise: o.discountPaise,
      total_paise: o.totalPaise,
      offers: o.offers,
    };
    const res = await this.db.from("orders").insert(row).select("*").single();
    if (res.error?.code === "23505") throw new Error("duplicate order number");
    return toOrder(check(res) as Row);
  }

  async getOrder(number: string) {
    const data = check(await this.db.from("orders").select("*").eq("number", number).maybeSingle());
    return data ? toOrder(data as Row) : null;
  }

  async listOrders(filter?: OrderFilter) {
    let q = this.db.from("orders").select("*").order("created_at", { ascending: false }).limit(filter?.limit ?? 200);
    if (filter?.status) q = q.eq("status", filter.status);
    const s = filter?.search?.trim().replace(/[%,()"]/g, "");
    if (s) q = q.or(`number.ilike.%${s}%,customer_name.ilike.%${s}%`);
    return (check(await q) as Row[]).map(toOrder);
  }

  async updateOrder(number: string, patch: OrderPatch) {
    const row: Row = { updated_at: new Date().toISOString() };
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.adminNote !== undefined) row.admin_note = patch.adminNote;
    return toOrder(check(await this.db.from("orders").update(row).eq("number", number).select("*").single()) as Row);
  }

  // Uploads, analytics, settings ---------------------------------------

  async saveUpload(id: string, file: File) {
    const path = `${new Date().toISOString().slice(0, 7)}/${id}.${EXT[file.type] ?? "bin"}`;
    check(await this.db.storage.from("customer-uploads").upload(path, file, { contentType: file.type, upsert: false }));
    check(await this.db.from("uploads").insert({ id, path, content_type: file.type, size: file.size }));
    return { id, path, contentType: file.type };
  }

  async readUpload(id: string) {
    const row = check(await this.db.from("uploads").select("path").eq("id", id).maybeSingle()) as Row | null;
    if (!row) return null;
    const { data } = await this.db.storage.from("customer-uploads").createSignedUrl(row.path as string, 300);
    return data?.signedUrl ? { url: data.signedUrl } : null;
  }

  async track(events: TrackEvent[]) {
    if (!events.length) return;
    check(await this.db.from("events").insert(events.map((e) => ({ type: e.type, product_id: e.productId, path: e.path }))));
  }

  async stats(sinceIso: string): Promise<Stats> {
    return check(await this.db.rpc("shop_stats", { p_since: sinceIso })) as Stats;
  }

  async getSettings(): Promise<Settings> {
    const row = check(await this.db.from("settings").select("data").eq("id", 1).maybeSingle()) as Row | null;
    return { ...DEFAULT_SETTINGS, ...((row?.data as Partial<Settings>) ?? {}) };
  }

  async saveSettings(settings: Settings) {
    check(await this.db.from("settings").upsert({ id: 1, data: settings }));
  }
}
