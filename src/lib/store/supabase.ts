import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { BlogPost, College, Collection, Coupon, CustomRequest, GalleryItem, Offer, Order, Product, Settings, Stall, StallSale, Stats } from "@/lib/types";
import { EMPTY_STATS } from "./memory";
import { DEFAULT_SETTINGS } from "./seed";
import type {
  CollectionInput,
  CollegeInput,
  CouponInput,
  CustomRequestPatch,
  GalleryInput,
  NewCustomRequest,
  NewOrder,
  NewStallSale,
  OfferInput,
  OrderFilter,
  OrderPatch,
  PostInput,
  ProductInput,
  StallInput,
  StallSaleFilter,
  Store,
  TrackEvent,
} from "./types";

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
    stock: (r.stock as number | null) ?? null,
    lowStockAt: (r.low_stock_at as number) ?? 5,
    costPaise: (r.cost_paise as number | null) ?? null,
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
    stock: p.stock,
    low_stock_at: p.lowStockAt,
    cost_paise: p.costPaise,
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
    percent: (r.percent as number | null) ?? null,
    startsAt: (r.starts_at as string | null) ?? null,
    endsAt: (r.ends_at as string | null) ?? null,
    banner: (r.banner as string) ?? "",
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
    viewKey: (r.view_key as string) ?? "",
    status: r.status as Order["status"],
    customerName: r.customer_name as string,
    customerPhone: (r.customer_phone as string) ?? "",
    fulfilment: (r.fulfilment as Order["fulfilment"]) ?? "delivery",
    address: { line: "", city: "", state: "", pincode: "", ...((r.address as Partial<Order["address"]>) ?? {}) },
    customerNote: r.customer_note as string,
    lines: r.lines as Order["lines"],
    subtotalPaise: r.subtotal_paise as number,
    discountPaise: r.discount_paise as number,
    totalPaise: r.total_paise as number,
    offers: (r.offers as Order["offers"]) ?? [],
    adminNote: r.admin_note as string,
    couponCode: (r.coupon_code as string) ?? "",
    source: (r.source as string) ?? "",
    instagram: (r.instagram as string) ?? "",
    stockTaken: Boolean(r.stock_taken),
    trackingNumber: (r.tracking_number as string) ?? "",
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function toCoupon(r: Row): Coupon {
  return {
    code: r.code as string,
    description: (r.description as string) ?? "",
    percent: (r.percent as number | null) ?? null,
    amountPaise: (r.amount_paise as number | null) ?? null,
    minOrderPaise: (r.min_order_paise as number) ?? 0,
    maxUses: (r.max_uses as number | null) ?? null,
    startsAt: (r.starts_at as string | null) ?? null,
    endsAt: (r.ends_at as string | null) ?? null,
    source: (r.source as string) ?? "",
    active: r.active as boolean,
    createdAt: r.created_at as string,
  };
}

function toCustom(r: Row): CustomRequest {
  return {
    id: r.id as string,
    number: r.number as string,
    status: r.status as CustomRequest["status"],
    customerName: r.customer_name as string,
    customerPhone: r.customer_phone as string,
    instagram: (r.instagram as string) ?? "",
    kind: r.kind as CustomRequest["kind"],
    size: (r.size as string) ?? "",
    qty: r.qty as number,
    note: (r.note as string) ?? "",
    files: (r.files as string[]) ?? [],
    source: (r.source as string) ?? "",
    adminNote: (r.admin_note as string) ?? "",
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function toStall(r: Row): Stall {
  return {
    id: r.id as string,
    name: r.name as string,
    date: r.date as string,
    venue: (r.venue as string) ?? "",
    collegeId: (r.college_id as string | null) ?? null,
    feePaise: (r.fee_paise as number) ?? 0,
    otherCostsPaise: (r.other_costs_paise as number) ?? 0,
    notes: (r.notes as string) ?? "",
    public: r.public !== false,
    createdAt: r.created_at as string,
  };
}

function toSale(r: Row): StallSale {
  return {
    id: r.id as string,
    stallId: (r.stall_id as string | null) ?? null,
    lines: r.lines as StallSale["lines"],
    subtotalPaise: r.subtotal_paise as number,
    discountPaise: r.discount_paise as number,
    totalPaise: r.total_paise as number,
    payment: r.payment as StallSale["payment"],
    note: (r.note as string) ?? "",
    soldAt: r.sold_at as string,
    createdAt: r.created_at as string,
  };
}

function toPost(r: Row): BlogPost {
  return {
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    excerpt: (r.excerpt as string) ?? "",
    body: (r.body as string) ?? "",
    cover: (r.cover as string) ?? "",
    tags: (r.tags as string[]) ?? [],
    status: r.status as BlogPost["status"],
    publishedAt: (r.published_at as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function toGallery(r: Row): GalleryItem {
  return {
    id: r.id as string,
    image: r.image as string,
    caption: (r.caption as string) ?? "",
    stallId: (r.stall_id as string | null) ?? null,
    collegeId: (r.college_id as string | null) ?? null,
    tags: (r.tags as string[]) ?? [],
    takenOn: (r.taken_on as string | null) ?? null,
    visible: r.visible !== false,
    sortOrder: (r.sort_order as number) ?? 0,
    createdAt: r.created_at as string,
  };
}

function toCollege(r: Row): College {
  return {
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    area: (r.area as string) ?? "",
    description: (r.description as string) ?? "",
    image: (r.image as string) ?? "",
    couponCode: (r.coupon_code as string) ?? "",
    productIds: (r.product_ids as string[]) ?? [],
    active: r.active !== false,
    sortOrder: (r.sort_order as number) ?? 0,
    createdAt: r.created_at as string,
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
      percent: o.percent,
      starts_at: o.startsAt,
      ends_at: o.endsAt,
      banner: o.banner,
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
      view_key: o.viewKey,
      customer_name: o.customerName,
      customer_phone: o.customerPhone,
      fulfilment: o.fulfilment,
      address: o.address,
      customer_note: o.customerNote,
      lines: o.lines,
      subtotal_paise: o.subtotalPaise,
      discount_paise: o.discountPaise,
      total_paise: o.totalPaise,
      offers: o.offers,
      coupon_code: o.couponCode,
      source: o.source,
      instagram: o.instagram,
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
    // The sync reads oldest change first so it can resume where it stopped.
    const sync = Boolean(filter?.updatedSince);
    let q = this.db
      .from("orders")
      .select("*")
      .order(sync ? "updated_at" : "created_at", { ascending: sync })
      .limit(filter?.limit ?? 200);
    if (filter?.status) q = q.eq("status", filter.status);
    const s = filter?.search?.trim().replace(/[%,()"]/g, "");
    if (s) q = q.or(`number.ilike.%${s}%,customer_name.ilike.%${s}%,customer_phone.ilike.%${s}%`);
    if (filter?.updatedSince) q = q.gt("updated_at", filter.updatedSince);
    if (filter?.createdSince) q = q.gte("created_at", filter.createdSince);
    return (check(await q) as Row[]).map(toOrder);
  }

  async updateOrder(number: string, patch: OrderPatch) {
    const row: Row = { updated_at: new Date().toISOString() };
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.adminNote !== undefined) row.admin_note = patch.adminNote;
    if (patch.trackingNumber !== undefined) row.tracking_number = patch.trackingNumber;
    return toOrder(check(await this.db.from("orders").update(row).eq("number", number).select("*").single()) as Row);
  }

  async moveStock(number: string, sign: -1 | 1) {
    // Flip the flag first, only if it's in the other state, so two clicks
    // (or two admins) can never take the same order's stock twice.
    const taken = sign === -1;
    const rows = check(
      await this.db.from("orders").update({ stock_taken: taken }).eq("number", number).eq("stock_taken", !taken).select("lines"),
    ) as Row[];
    if (!rows.length) return;
    check(await this.db.rpc("adjust_stock", { p_lines: rows[0].lines, p_sign: sign }));
  }

  // Coupons -------------------------------------------------------------

  async listCoupons() {
    return (check(await this.db.from("coupons").select("*").order("created_at", { ascending: false })) as Row[]).map(toCoupon);
  }

  async getCoupon(code: string) {
    const data = check(await this.db.from("coupons").select("*").eq("code", code).maybeSingle());
    return data ? toCoupon(data as Row) : null;
  }

  async saveCoupon(c: CouponInput, isNew: boolean) {
    const row = {
      code: c.code,
      description: c.description,
      percent: c.percent,
      amount_paise: c.amountPaise,
      min_order_paise: c.minOrderPaise,
      max_uses: c.maxUses,
      starts_at: c.startsAt,
      ends_at: c.endsAt,
      source: c.source,
      active: c.active,
    };
    const res = isNew ? await this.db.from("coupons").insert(row).select("*").single() : await this.db.from("coupons").update(row).eq("code", c.code).select("*").single();
    if (res.error?.code === "23505") throw new Error(`The code ${c.code} already exists.`);
    return toCoupon(check(res) as Row);
  }

  async deleteCoupon(code: string) {
    check(await this.db.from("coupons").delete().eq("code", code));
  }

  async couponUses(code: string) {
    const res = await this.db.from("orders").select("id", { count: "exact", head: true }).eq("coupon_code", code).neq("status", "cancelled");
    if (res.error) throw new Error(res.error.message);
    return res.count ?? 0;
  }

  // Custom requests -----------------------------------------------------

  async createCustomRequest(c: NewCustomRequest) {
    const res = await this.db
      .from("custom_requests")
      .insert({
        number: c.number,
        customer_name: c.customerName,
        customer_phone: c.customerPhone,
        instagram: c.instagram,
        kind: c.kind,
        size: c.size,
        qty: c.qty,
        note: c.note,
        files: c.files,
        source: c.source,
      })
      .select("*")
      .single();
    if (res.error?.code === "23505") throw new Error("duplicate request number");
    return toCustom(check(res) as Row);
  }

  async getCustomRequest(number: string) {
    const data = check(await this.db.from("custom_requests").select("*").eq("number", number).maybeSingle());
    return data ? toCustom(data as Row) : null;
  }

  async listCustomRequests(limit = 200) {
    return (check(await this.db.from("custom_requests").select("*").order("created_at", { ascending: false }).limit(limit)) as Row[]).map(toCustom);
  }

  async updateCustomRequest(number: string, patch: CustomRequestPatch) {
    const row: Row = { updated_at: new Date().toISOString() };
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.adminNote !== undefined) row.admin_note = patch.adminNote;
    return toCustom(check(await this.db.from("custom_requests").update(row).eq("number", number).select("*").single()) as Row);
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
    check(await this.db.from("events").insert(events.map((e) => ({ type: e.type, product_id: e.productId, path: e.path, source: e.source ?? "" }))));
  }

  async stats(sinceIso: string): Promise<Stats> {
    // Before the v5 migration the function returns fewer fields; fill the rest.
    return { ...EMPTY_STATS, ...(check(await this.db.rpc("shop_stats", { p_since: sinceIso })) as Partial<Stats>) };
  }

  async getSettings(): Promise<Settings> {
    const row = check(await this.db.from("settings").select("data").eq("id", 1).maybeSingle()) as Row | null;
    return { ...DEFAULT_SETTINGS, ...((row?.data as Partial<Settings>) ?? {}) };
  }

  async saveSettings(settings: Settings) {
    check(await this.db.from("settings").upsert({ id: 1, data: settings }));
  }

  // Stalls ----------------------------------------------------------------

  async listStalls() {
    return (check(await this.db.from("stalls").select("*").order("date", { ascending: false }).order("name")) as Row[]).map(toStall);
  }

  async getStall(id: string) {
    const data = check(await this.db.from("stalls").select("*").eq("id", id).maybeSingle());
    return data ? toStall(data as Row) : null;
  }

  async saveStall(id: string | null, st: StallInput) {
    const row = {
      name: st.name,
      date: st.date,
      venue: st.venue,
      college_id: st.collegeId,
      fee_paise: st.feePaise,
      other_costs_paise: st.otherCostsPaise,
      notes: st.notes,
      public: st.public,
    };
    const res = id ? await this.db.from("stalls").update(row).eq("id", id).select("*").single() : await this.db.from("stalls").insert(row).select("*").single();
    return toStall(check(res) as Row);
  }

  async deleteStall(id: string) {
    check(await this.db.from("stalls").delete().eq("id", id));
  }

  async recordStallSale(x: NewStallSale) {
    const row = {
      id: x.id,
      stall_id: x.stallId,
      lines: x.lines,
      subtotal_paise: x.subtotalPaise,
      discount_paise: x.discountPaise,
      total_paise: x.totalPaise,
      payment: x.payment,
      note: x.note,
      sold_at: x.soldAt,
    };
    // ignoreDuplicates: a sale synced twice returns no row the second time,
    // so stock is only taken once.
    const inserted = check(await this.db.from("stall_sales").upsert(row, { onConflict: "id", ignoreDuplicates: true }).select("*")) as Row[];
    if (inserted.length) {
      check(await this.db.rpc("adjust_stock", { p_lines: x.lines, p_sign: -1 }));
      return { sale: toSale(inserted[0]), created: true };
    }
    const existing = check(await this.db.from("stall_sales").select("*").eq("id", x.id).single()) as Row;
    return { sale: toSale(existing), created: false };
  }

  async listStallSales(filter?: StallSaleFilter) {
    let q = this.db
      .from("stall_sales")
      .select("*")
      .order("sold_at", { ascending: false })
      .limit(filter?.limit ?? 5000);
    if (filter?.stallId) q = q.eq("stall_id", filter.stallId);
    if (filter?.since) q = q.gte("sold_at", filter.since);
    return (check(await q) as Row[]).map(toSale);
  }

  async voidStallSale(id: string) {
    const rows = check(await this.db.from("stall_sales").delete().eq("id", id).select("lines")) as Row[];
    if (rows.length) check(await this.db.rpc("adjust_stock", { p_lines: rows[0].lines, p_sign: 1 }));
  }

  // Blog, gallery, colleges -------------------------------------------------

  async listPosts(opts?: { includeDrafts?: boolean }) {
    let q = this.db.from("blog_posts").select("*").order("published_at", { ascending: false, nullsFirst: true }).order("created_at", { ascending: false });
    if (!opts?.includeDrafts) q = q.eq("status", "published");
    return (check(await q) as Row[]).map(toPost);
  }

  async getPost(id: string) {
    const data = check(await this.db.from("blog_posts").select("*").eq("id", id).maybeSingle());
    return data ? toPost(data as Row) : null;
  }

  async savePost(id: string | null, p: PostInput) {
    const row = {
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      body: p.body,
      cover: p.cover,
      tags: p.tags,
      status: p.status,
      published_at: p.publishedAt,
      updated_at: new Date().toISOString(),
    };
    const res = id ? await this.db.from("blog_posts").update(row).eq("id", id).select("*").single() : await this.db.from("blog_posts").insert(row).select("*").single();
    return toPost(check(res) as Row);
  }

  async deletePost(id: string) {
    check(await this.db.from("blog_posts").delete().eq("id", id));
  }

  async listGallery(opts?: { includeHidden?: boolean }) {
    let q = this.db.from("gallery_items").select("*").order("sort_order").order("created_at", { ascending: false });
    if (!opts?.includeHidden) q = q.eq("visible", true);
    return (check(await q) as Row[]).map(toGallery);
  }

  async saveGalleryItem(id: string | null, g: GalleryInput) {
    const row = {
      image: g.image,
      caption: g.caption,
      stall_id: g.stallId,
      college_id: g.collegeId,
      tags: g.tags,
      taken_on: g.takenOn,
      visible: g.visible,
      sort_order: g.sortOrder,
    };
    const res = id ? await this.db.from("gallery_items").update(row).eq("id", id).select("*").single() : await this.db.from("gallery_items").insert(row).select("*").single();
    return toGallery(check(res) as Row);
  }

  async deleteGalleryItem(id: string) {
    check(await this.db.from("gallery_items").delete().eq("id", id));
  }

  async listColleges(opts?: { includeHidden?: boolean }) {
    let q = this.db.from("colleges").select("*").order("sort_order").order("name");
    if (!opts?.includeHidden) q = q.eq("active", true);
    return (check(await q) as Row[]).map(toCollege);
  }

  async getCollege(id: string) {
    const data = check(await this.db.from("colleges").select("*").eq("id", id).maybeSingle());
    return data ? toCollege(data as Row) : null;
  }

  async saveCollege(id: string | null, c: CollegeInput) {
    const row = {
      slug: c.slug,
      name: c.name,
      area: c.area,
      description: c.description,
      image: c.image,
      coupon_code: c.couponCode,
      product_ids: c.productIds,
      active: c.active,
      sort_order: c.sortOrder,
    };
    const res = id ? await this.db.from("colleges").update(row).eq("id", id).select("*").single() : await this.db.from("colleges").insert(row).select("*").single();
    return toCollege(check(res) as Row);
  }

  async deleteCollege(id: string) {
    check(await this.db.from("colleges").delete().eq("id", id));
  }

  async exportAll() {
    // Paged so a table bigger than one response still comes back whole.
    const all = async (table: string) => {
      const out: Row[] = [];
      for (let from = 0; ; from += 1000) {
        const page = check(await this.db.from(table).select("*").range(from, from + 999)) as Row[];
        out.push(...page);
        if (page.length < 1000) return out;
      }
    };
    const tables = ["products", "collections", "offers", "orders", "coupons", "custom_requests", "uploads", "settings", "stalls", "stall_sales", "blog_posts", "gallery_items", "colleges"];
    const out: Record<string, unknown> = {};
    for (const t of tables) out[t] = await all(t);
    return out;
  }
}
