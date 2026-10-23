import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CustomRequest, Order, OrderItem, Product, Settings, Variant } from "@/lib/types";
import { DEFAULT_SETTINGS } from "./seed";
import { OutOfStockError, type NewOrder, type OrderFilter, type OrderPatch, type ProductInput, type Store } from "./types";

type Row = Record<string, unknown>;

const PRODUCT_SELECT = "*, product_variants(*)";

function toVariant(r: Row): Variant {
  return {
    id: r.id as string,
    label: r.label as string,
    pricePaise: (r.price_paise as number | null) ?? null,
    stock: (r.stock as number | null) ?? null,
    active: r.active as boolean,
    sortOrder: r.sort_order as number,
  };
}

function toProduct(r: Row): Product {
  return {
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    category: r.category as Product["category"],
    description: r.description as string,
    details: r.details as string,
    images: (r.images as string[]) ?? [],
    tags: (r.tags as string[]) ?? [],
    active: r.active as boolean,
    featured: r.featured as boolean,
    sortOrder: r.sort_order as number,
    variants: ((r.product_variants as Row[]) ?? []).map(toVariant).sort((a, b) => a.sortOrder - b.sortOrder),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function toOrder(r: Row): Order {
  return {
    id: r.id as string,
    number: r.number as string,
    accessToken: r.access_token as string,
    status: r.status as Order["status"],
    fulfilment: r.fulfilment as Order["fulfilment"],
    paymentMethod: r.payment_method as Order["paymentMethod"],
    customer: r.customer as Order["customer"],
    address: (r.address as Order["address"]) ?? null,
    notes: r.notes as string,
    items: r.items as OrderItem[],
    subtotalPaise: r.subtotal_paise as number,
    shippingPaise: r.shipping_paise as number,
    totalPaise: r.total_paise as number,
    utr: (r.utr as string | null) ?? null,
    courier: (r.courier as string | null) ?? null,
    trackingNumber: (r.tracking_number as string | null) ?? null,
    adminNote: r.admin_note as string,
    events: (r.events as Order["events"]) ?? [],
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function toCustom(r: Row): CustomRequest {
  return {
    id: r.id as string,
    name: r.name as string,
    contact: r.contact as string,
    description: r.description as string,
    cut: r.cut as string,
    size: r.size as string,
    quantity: r.quantity as number,
    file: (r.file as string | null) ?? null,
    status: r.status as CustomRequest["status"],
    adminNote: r.admin_note as string,
    createdAt: r.created_at as string,
  };
}

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export class SupabaseStore implements Store {
  readonly mode = "supabase" as const;
  private db: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.db = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async listProducts(opts?: { includeInactive?: boolean }) {
    let q = this.db
      .from("products")
      .select(PRODUCT_SELECT)
      .order("featured", { ascending: false })
      .order("sort_order")
      .order("name");
    if (!opts?.includeInactive) q = q.eq("active", true);
    return (check(await q) as Row[]).map(toProduct);
  }

  async getProductBySlug(slug: string) {
    const data = check(await this.db.from("products").select(PRODUCT_SELECT).eq("slug", slug).maybeSingle());
    return data ? toProduct(data as Row) : null;
  }

  async getProduct(id: string) {
    const data = check(await this.db.from("products").select(PRODUCT_SELECT).eq("id", id).maybeSingle());
    return data ? toProduct(data as Row) : null;
  }

  private productRow(input: ProductInput) {
    return {
      slug: input.slug,
      name: input.name,
      category: input.category,
      description: input.description,
      details: input.details,
      images: input.images,
      tags: input.tags,
      active: input.active,
      featured: input.featured,
      sort_order: input.sortOrder,
      updated_at: new Date().toISOString(),
    };
  }

  private async saveVariants(productId: string, variants: ProductInput["variants"]) {
    const rows = variants.map((v) => ({
      ...(v.id ? { id: v.id } : {}),
      product_id: productId,
      label: v.label,
      price_paise: v.pricePaise,
      stock: v.stock,
      active: v.active,
      sort_order: v.sortOrder,
    }));
    const keep = rows.filter((r) => "id" in r).map((r) => r.id as string);
    // Drop variants removed in the form, then upsert the rest.
    let del = this.db.from("product_variants").delete().eq("product_id", productId);
    if (keep.length) del = del.not("id", "in", `(${keep.map((id) => `"${id}"`).join(",")})`);
    check(await del);
    const existing = rows.filter((r) => "id" in r);
    const fresh = rows.filter((r) => !("id" in r));
    if (existing.length) check(await this.db.from("product_variants").upsert(existing));
    if (fresh.length) check(await this.db.from("product_variants").insert(fresh));
  }

  async createProduct(input: ProductInput) {
    const row = check(await this.db.from("products").insert(this.productRow(input)).select("id").single()) as Row;
    await this.saveVariants(row.id as string, input.variants);
    return (await this.getProduct(row.id as string))!;
  }

  async updateProduct(id: string, input: ProductInput) {
    check(await this.db.from("products").update(this.productRow(input)).eq("id", id));
    await this.saveVariants(id, input.variants);
    return (await this.getProduct(id))!;
  }

  async deleteProduct(id: string) {
    check(await this.db.from("products").delete().eq("id", id));
  }

  async uploadProductImage(file: File) {
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${EXT[file.type] ?? "bin"}`;
    check(
      await this.db.storage.from("product-images").upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      }),
    );
    return this.db.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  }

  async placeOrder(order: NewOrder) {
    const { data, error } = await this.db.rpc("place_order", { p_order: order });
    if (error) {
      const m = /OUT_OF_STOCK:(\S+)/.exec(error.message);
      if (m) throw new OutOfStockError(m[1]);
      throw new Error(error.message);
    }
    return toOrder(data as Row);
  }

  async getOrderByNumber(number: string) {
    const data = check(await this.db.from("orders").select("*").eq("number", number).maybeSingle());
    return data ? toOrder(data as Row) : null;
  }

  async listOrders(filter?: OrderFilter) {
    let q = this.db.from("orders").select("*").order("created_at", { ascending: false }).limit(filter?.limit ?? 200);
    if (filter?.status) q = q.eq("status", filter.status);
    const s = filter?.search?.trim().replace(/[%,()"]/g, "");
    if (s) q = q.or(`number.ilike.%${s}%,customer->>name.ilike.%${s}%,customer->>phone.ilike.%${s}%`);
    return (check(await q) as Row[]).map(toOrder);
  }

  async updateOrder(number: string, patch: OrderPatch) {
    const { event, ...f } = patch;
    const row: Row = { updated_at: new Date().toISOString() };
    if (f.status !== undefined) row.status = f.status;
    if (f.utr !== undefined) row.utr = f.utr;
    if (f.courier !== undefined) row.courier = f.courier;
    if (f.trackingNumber !== undefined) row.tracking_number = f.trackingNumber;
    if (f.adminNote !== undefined) row.admin_note = f.adminNote;
    const res = await this.db.from("orders").update(row).eq("number", number);
    if (res.error?.code === "23505") throw new Error("That UPI reference is already attached to another order.");
    check(res);
    if (event) check(await this.db.rpc("append_order_event", { p_number: number, p_event: event }));
    const order = await this.getOrderByNumber(number);
    if (!order) throw new Error("Order not found");
    return order;
  }

  async restock(items: OrderItem[]) {
    check(await this.db.rpc("restock_items", { p_items: items }));
  }

  async createCustomRequest(input: Omit<CustomRequest, "id" | "createdAt" | "status" | "adminNote" | "file">, file: File | null) {
    let path: string | null = null;
    if (file) {
      path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${EXT[file.type] ?? "bin"}`;
      check(await this.db.storage.from("custom-uploads").upload(path, file, { contentType: file.type }));
    }
    const row = check(
      await this.db
        .from("custom_requests")
        .insert({
          name: input.name,
          contact: input.contact,
          description: input.description,
          cut: input.cut,
          size: input.size,
          quantity: input.quantity,
          file: path,
        })
        .select("*")
        .single(),
    );
    return toCustom(row as Row);
  }

  async listCustomRequests() {
    const rows = check(await this.db.from("custom_requests").select("*").order("created_at", { ascending: false }).limit(200));
    return (rows as Row[]).map(toCustom);
  }

  async updateCustomRequest(id: string, patch: { status?: CustomRequest["status"]; adminNote?: string }) {
    const row: Row = {};
    if (patch.status) row.status = patch.status;
    if (patch.adminNote !== undefined) row.admin_note = patch.adminNote;
    check(await this.db.from("custom_requests").update(row).eq("id", id));
  }

  async customFileUrl(file: string) {
    const { data } = await this.db.storage.from("custom-uploads").createSignedUrl(file, 600);
    return data?.signedUrl ?? null;
  }

  async getSettings(): Promise<Settings> {
    const row = check(await this.db.from("settings").select("data").eq("id", 1).maybeSingle()) as Row | null;
    return { ...DEFAULT_SETTINGS, ...((row?.data as Partial<Settings>) ?? {}) };
  }

  async saveSettings(settings: Settings) {
    check(await this.db.from("settings").upsert({ id: 1, data: settings }));
  }
}
