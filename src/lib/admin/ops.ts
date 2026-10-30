import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CUSTOM_NUMBER_RE, ORDER_NUMBER_RE } from "@/lib/constants";
import { costKey } from "@/lib/costs";
import { cleanHandle, INSTAGRAM_HANDLE_RE } from "@/lib/instagram";
import { safeUrl } from "@/lib/markdown";
import { istInputToIso, rupeesToPaise } from "@/lib/money";
import { setOrderStatus } from "@/lib/orders";
import { normalizePhone } from "@/lib/phone";
import { COUPON_CODE_RE, normalizeCode } from "@/lib/pricing";
import { cleanTracking, TRACKING_RE } from "@/lib/shipping";
import { SALE_ID_RE } from "@/lib/stall";
import { getStore } from "@/lib/store";
import { TEMPLATES } from "@/lib/store/seed";
import type { ProductInput } from "@/lib/store/types";
import {
  CUSTOM_FIELD_KINDS,
  CUSTOM_STATUSES,
  OFFER_KINDS,
  ORDER_STATUSES,
  POST_STATUSES,
  PRODUCT_STATUSES,
  PRODUCT_TYPE_IDS,
  type Product,
  type Settings,
} from "@/lib/types";
import { UPI_ID_RE } from "@/lib/upi";
import { cleanSource } from "@/lib/validation";

// Every admin change, as plain functions over JSON-shaped input. The web
// admin's server actions and the Android admin app's API both call these,
// so a rule (and its error message) lives in one place. Callers check the
// admin first; nothing here does.

export type OpResult = { ok: true; message?: string; id?: string } | { ok: false; error: string };

const fail = (error: string): OpResult => ({ ok: false, error });
const firstIssue = (err: z.ZodError) => err.issues[0]?.message ?? "Check the fields.";
const errorText = (err: unknown) => (err as Error).message;

function refreshShop() {
  // Storefront pages are cached for 60s; changes in admin show at once.
  revalidatePath("/", "layout");
}

const slugRe = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const idRe = /^[a-z0-9-]{1,40}$/;

export function toSlug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const tagList = (v: string) =>
  v
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);

/** A photo is an uploaded URL, a site path or (in preview mode) a data URL. */
const image = z
  .string()
  .max(3_000_000)
  .refine((v) => v === "" || v.startsWith("data:image/") || safeUrl(v) !== null, "That image link doesn't look right.");

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : typeof v === "number" ? String(v) : "");

// Orders --------------------------------------------------------------

const orderUpdateSchema = z.object({
  number: z.string().regex(ORDER_NUMBER_RE),
  status: z.enum(ORDER_STATUSES),
  adminNote: z.string().trim().max(2000),
});

export async function updateOrder(raw: unknown): Promise<OpResult> {
  const parsed = orderUpdateSchema.safeParse(raw);
  if (!parsed.success) return fail("Check the fields.");
  const { number, status, adminNote } = parsed.data;
  try {
    await setOrderStatus(number, status, adminNote);
  } catch (err) {
    return fail(errorText(err));
  }
  refreshShop(); // stock may have changed
  revalidatePath(`/admin/orders/${number}`);
  revalidatePath("/admin/orders");
  return { ok: true, message: "Saved." };
}

export async function quickOrderStatus(number: string, statusRaw: unknown): Promise<OpResult> {
  const status = z.enum(ORDER_STATUSES).safeParse(statusRaw);
  if (!ORDER_NUMBER_RE.test(number) || !status.success) return fail("Unknown order or status.");
  try {
    await setOrderStatus(number, status.data);
  } catch (err) {
    return fail(errorText(err));
  }
  refreshShop();
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true, message: "Saved." };
}

export async function shipOrder(input: { number: string; trackingNumber: string; markShipped: boolean }): Promise<OpResult> {
  const tracking = cleanTracking(input.trackingNumber);
  if (!ORDER_NUMBER_RE.test(input.number)) return fail("Unknown order.");
  if (tracking && !TRACKING_RE.test(tracking)) return fail("The tracking number should be letters and digits, like EE123456789IN.");
  try {
    await getStore().updateOrder(input.number, { trackingNumber: tracking });
    if (input.markShipped) await setOrderStatus(input.number, "shipped");
  } catch (err) {
    return fail(errorText(err));
  }
  revalidatePath("/admin/packing");
  revalidatePath(`/admin/orders/${input.number}`);
  revalidatePath("/admin/orders");
  return { ok: true, message: input.markShipped ? "Marked shipped." : "Saved." };
}

// Products ------------------------------------------------------------

const money = z
  .string()
  .trim()
  .max(12)
  .transform((v, ctx) => {
    const p = rupeesToPaise(v);
    if (Number.isNaN(p)) {
      ctx.addIssue({ code: "custom", message: `"${v}" isn't a price. Use numbers like 10 or 49.50.` });
      return z.NEVER;
    }
    return p;
  });
const delta = z
  .string()
  .trim()
  .max(12)
  .transform((v, ctx) => {
    if (v === "") return 0;
    const neg = v.startsWith("-");
    const p = rupeesToPaise(neg ? v.slice(1) : v.replace(/^\+/, ""));
    if (p === null || Number.isNaN(p)) {
      ctx.addIssue({ code: "custom", message: `"${v}" isn't a price change. Use numbers like 50 or -20.` });
      return z.NEVER;
    }
    return neg ? -p : p;
  });

const productSchema = z.object({
  name: z.string().trim().min(1, "Add a name.").max(120),
  slug: z.string().trim().toLowerCase().regex(slugRe, "Link name: lowercase letters, numbers and dashes only."),
  type: z.enum(PRODUCT_TYPE_IDS),
  collectionIds: z.array(z.string().max(64)).max(20),
  description: z.string().trim().max(3000),
  details: z.string().trim().max(3000),
  tags: z.string().trim().max(300),
  images: z.array(z.string().max(3_000_000)).max(12),
  status: z.enum(PRODUCT_STATUSES),
  featured: z.boolean(),
  soldOut: z.boolean(),
  badge: z.string().trim().max(24),
  sortOrder: z.coerce.number().int().min(-9999).max(9999),
  price: money,
  compareAt: money,
  minQty: z.coerce.number().int().min(1, "Minimum order must be at least 1.").max(999),
  options: z
    .array(
      z.object({
        id: z.string().regex(idRe),
        name: z.string().trim().min(1, "Every option needs a name, like Size.").max(40),
        values: z
          .array(z.object({ id: z.string().regex(idRe), label: z.string().trim().min(1, "Every choice needs a name, like A4.").max(60), delta }))
          .min(1, "Every option needs at least one choice.")
          .max(20),
      }),
    )
    .max(6),
  customFields: z
    .array(
      z.object({
        id: z.string().regex(idRe),
        label: z.string().trim().min(1, "Every custom field needs a label.").max(60),
        kind: z.enum(CUSTOM_FIELD_KINDS),
        required: z.boolean(),
        help: z.string().trim().max(200),
      }),
    )
    .max(8),
  stock: z
    .string()
    .trim()
    .max(6)
    .transform((v, ctx) => {
      if (v === "") return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > 99999) {
        ctx.addIssue({ code: "custom", message: "Stock is a whole number like 25, or blank for made to order." });
        return z.NEVER;
      }
      return n;
    }),
  lowStockAt: z.coerce.number().int().min(0).max(9999),
  cost: money,
});

export function editableProduct(p: Product): ProductInput {
  return {
    name: p.name,
    slug: p.slug,
    type: p.type,
    collectionIds: p.collectionIds,
    description: p.description,
    details: p.details,
    tags: p.tags,
    images: p.images,
    status: p.status,
    featured: p.featured,
    soldOut: p.soldOut,
    badge: p.badge,
    sortOrder: p.sortOrder,
    pricePaise: p.pricePaise,
    compareAtPaise: p.compareAtPaise,
    minQty: p.minQty,
    options: p.options,
    customFields: p.customFields,
    stock: p.stock,
    lowStockAt: p.lowStockAt,
    costPaise: p.costPaise,
  };
}

function toProductInput(p: z.infer<typeof productSchema>): ProductInput {
  return {
    name: p.name,
    slug: p.slug,
    type: p.type,
    collectionIds: p.collectionIds,
    description: p.description,
    details: p.details,
    tags: p.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    images: p.images,
    status: p.status,
    featured: p.featured,
    soldOut: p.soldOut,
    badge: p.badge,
    sortOrder: p.sortOrder,
    pricePaise: p.price,
    compareAtPaise: p.compareAt,
    minQty: p.minQty,
    options: p.options.map((g) => ({ id: g.id, name: g.name, values: g.values.map((v) => ({ id: v.id, label: v.label, priceDeltaPaise: v.delta })) })),
    customFields: p.customFields,
    stock: p.stock,
    lowStockAt: p.lowStockAt,
    costPaise: p.cost,
  };
}

/** Creates (id null) or updates a product. The payload is the product form's shape. */
export async function saveProduct(raw: unknown, id: string | null): Promise<OpResult> {
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const input = toProductInput(parsed.data);
  for (const g of input.options) {
    if (new Set(g.values.map((v) => v.id)).size !== g.values.length) return fail(`"${g.name}" has two choices with the same name.`);
  }
  let savedId: string;
  try {
    const store = getStore();
    const saved = id ? await store.updateProduct(id, input) : await store.createProduct(input);
    savedId = saved.id;
  } catch (err) {
    return fail(errorText(err));
  }
  refreshShop();
  revalidatePath("/admin/products");
  return { ok: true, message: "Saved.", id: savedId };
}

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function uploadProductImage(file: unknown): Promise<{ url?: string; error?: string }> {
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image." };
  if (!IMAGE_TYPES.includes(file.type)) return { error: "Use PNG, JPG or WebP." };
  if (file.size > 5 * 1024 * 1024) return { error: "Images can be up to 5 MB." };
  try {
    return { url: await getStore().uploadProductImage(file) };
  } catch (err) {
    return { error: errorText(err) };
  }
}

export async function deleteProduct(id: string): Promise<OpResult> {
  if (id) await getStore().deleteProduct(id);
  refreshShop();
  revalidatePath("/admin/products");
  return { ok: true, message: "Deleted." };
}

export const QUICK_PRODUCT_OPS = ["live", "hidden", "upcoming", "soldOut", "featured"] as const;

/**
 * Quick changes from a product list: live / hidden / upcoming, sold out and
 * featured toggles, and (app only) a new stock count.
 */
export async function quickProduct(id: string, op: string, stock?: number | null): Promise<OpResult> {
  const store = getStore();
  const p = await store.getProduct(id);
  if (!p) return fail("Unknown product.");
  const input = editableProduct(p);
  if (op === "live" || op === "hidden" || op === "upcoming") input.status = op;
  else if (op === "soldOut") input.soldOut = !input.soldOut;
  else if (op === "featured") input.featured = !input.featured;
  else if (op === "stock") {
    if (stock !== null && (stock === undefined || !Number.isInteger(stock) || stock < 0 || stock > 99999)) return fail("Stock is a whole number like 25, or blank for made to order.");
    input.stock = stock;
  } else return fail("Unknown change.");
  await store.updateProduct(id, input);
  refreshShop();
  revalidatePath("/admin/products");
  return { ok: true, message: "Saved." };
}

/**
 * Bulk add: one product per uploaded photo, all with the same type, price,
 * options and collection. Names come from the file names.
 */
const bulkSchema = z.object({
  type: z.enum(PRODUCT_TYPE_IDS),
  collectionId: z.string().max(64),
  price: money,
  status: z.enum(PRODUCT_STATUSES),
  namePrefix: z.string().trim().max(60),
  items: z.array(z.object({ name: z.string().trim().min(1).max(120), image: z.string().max(3_000_000) })).min(1, "Add some photos first.").max(100),
});

export async function bulkCreate(raw: unknown): Promise<OpResult> {
  const parsed = bulkSchema.safeParse(raw);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const b = parsed.data;
  const store = getStore();
  const existing = new Set((await store.listProducts({ includeHidden: true })).map((p) => p.slug));
  const t = TEMPLATES[b.type];
  let created = 0;
  for (const [i, item] of b.items.entries()) {
    const name = `${b.namePrefix ? `${b.namePrefix} ` : ""}${item.name}`.trim();
    let slug = toSlug(name) || `item-${Date.now().toString(36)}`;
    for (let n = 2; existing.has(slug); n++) slug = `${toSlug(name)}-${n}`;
    existing.add(slug);
    await store.createProduct({
      name,
      slug,
      type: b.type,
      collectionIds: b.collectionId ? [b.collectionId] : [],
      description: "",
      details: t.details,
      tags: [],
      images: [item.image],
      status: b.status,
      featured: false,
      soldOut: false,
      badge: "",
      sortOrder: i,
      pricePaise: b.price,
      compareAtPaise: null,
      minQty: 1,
      options: structuredClone(t.options),
      customFields: structuredClone(t.customFields),
      stock: null,
      lowStockAt: 5,
      costPaise: null,
    });
    created++;
  }
  refreshShop();
  revalidatePath("/admin/products");
  return { ok: true, message: `Added ${created} product${created === 1 ? "" : "s"}.` };
}

// Collections ---------------------------------------------------------

const collectionSchema = z.object({
  name: z.string().trim().min(1, "Add a name.").max(80),
  slug: z.string().trim().toLowerCase().regex(slugRe, "Link name: lowercase letters, numbers and dashes only."),
  description: z.string().trim().max(500),
  image: z.string().max(3_000_000),
  active: z.boolean(),
  featured: z.boolean(),
  sortOrder: z.coerce.number().int().min(-9999).max(9999),
  productIds: z.array(z.string().max(64)).max(1000),
});

export async function saveCollection(raw: unknown, id: string | null): Promise<OpResult> {
  const parsed = collectionSchema.safeParse(raw);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { productIds, ...input } = parsed.data;
  const store = getStore();
  let savedId: string;
  try {
    const saved = id ? await store.updateCollection(id, input) : await store.createCollection(input);
    savedId = saved.id;
    // Sync membership: add to picked products, remove from the rest.
    const wanted = new Set(productIds);
    for (const p of await store.listProducts({ includeHidden: true })) {
      const has = p.collectionIds.includes(savedId);
      if (has === wanted.has(p.id)) continue;
      const rest = editableProduct(p);
      rest.collectionIds = has ? rest.collectionIds.filter((c) => c !== savedId) : [...rest.collectionIds, savedId];
      await store.updateProduct(p.id, rest);
    }
  } catch (err) {
    return fail(errorText(err));
  }
  refreshShop();
  revalidatePath("/admin/collections");
  return { ok: true, message: "Saved.", id: savedId };
}

export async function deleteCollection(id: string): Promise<OpResult> {
  if (id) await getStore().deleteCollection(id);
  refreshShop();
  revalidatePath("/admin/collections");
  return { ok: true, message: "Deleted." };
}

// Offers --------------------------------------------------------------

const offerSchema = z.object({
  id: z.string().max(64).optional(),
  kind: z.enum(OFFER_KINDS),
  name: z.string().trim().min(1, "Name the offer.").max(80),
  description: z.string().trim().max(200),
  productType: z.union([z.literal(""), z.enum(PRODUCT_TYPE_IDS)]),
  buy: z.coerce.number().int().min(1, "Buy must be at least 1.").max(100),
  free: z.coerce.number().int().min(1, "Free must be at least 1.").max(100).catch(1),
  percent: z.coerce.number().int().min(1, "% off must be 1 to 90.").max(90, "% off must be 1 to 90.").nullable().catch(null),
  price: money,
  sortOrder: z.coerce.number().int().min(-999).max(999),
  banner: z.string().trim().max(160).catch(""),
});

/**
 * Form fields as strings (numbers are fine too), plus active and the
 * startsAt / endsAt date-picker values (India time, "" for none).
 */
export type OfferFields = Record<string, unknown> & { kind?: unknown; active: boolean; startsAt?: unknown; endsAt?: unknown };

export async function saveOffer(f: OfferFields): Promise<OpResult> {
  const kind = f.kind;
  const parsed = offerSchema.safeParse({
    ...f,
    // % off offers have no buy/free; store 1 so the columns stay valid.
    buy: kind === "percent" ? 1 : f.buy,
    percent: kind === "percent" ? f.percent : null,
    price: str(f.price, 12),
    sortOrder: f.sortOrder || 0,
    banner: f.banner ?? "",
  });
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { id, productType, price, percent, banner, ...rest } = parsed.data;
  if (rest.kind === "volume" && price === null) return fail("Set the price each item drops to.");
  if (rest.kind === "percent" && percent === null) return fail("Set the % off, 1 to 90.");
  const startsAt = istInputToIso(str(f.startsAt, 40));
  const endsAt = istInputToIso(str(f.endsAt, 40));
  if (startsAt === undefined || endsAt === undefined) return fail("Pick start and end dates with the date picker, or leave them blank.");
  if (startsAt && endsAt && endsAt <= startsAt) return fail("The end has to be after the start.");
  const saved = await getStore().saveOffer(id || null, {
    ...rest,
    free: rest.kind === "bxgy" ? rest.free : 1,
    pricePaise: rest.kind === "volume" ? price : null,
    percent: rest.kind === "percent" ? percent : null,
    startsAt,
    endsAt,
    banner: rest.kind === "percent" ? banner : "",
    productType: productType || null,
    active: f.active,
  });
  refreshShop();
  revalidatePath("/admin/offers");
  return { ok: true, message: "Saved.", id: saved.id };
}

export async function deleteOffer(id: string): Promise<OpResult> {
  if (id) await getStore().deleteOffer(id);
  refreshShop();
  revalidatePath("/admin/offers");
  return { ok: true, message: "Deleted." };
}

// Coupons -------------------------------------------------------------

const couponSchema = z.object({
  code: z
    .string()
    .transform((v) => normalizeCode(v))
    .pipe(z.string().regex(COUPON_CODE_RE, "Code: 3 to 20 letters, numbers or dashes, like WORDSUP10.")),
  isNew: z.enum(["1", "0"]),
  description: z.string().trim().max(160),
  kind: z.enum(["percent", "amount"]),
  value: z.string().trim().max(12),
  minOrder: z.string().trim().max(12),
  maxUses: z.string().trim().max(6),
  source: z.string().trim().max(40),
});

/** Form fields as strings, plus active and startsAt / endsAt (India time, "" for none). */
export type CouponFields = Record<string, unknown> & { active: boolean; startsAt?: unknown; endsAt?: unknown };

export async function saveCoupon(f: CouponFields): Promise<OpResult> {
  const parsed = couponSchema.safeParse(f);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const c = parsed.data;
  let percent: number | null = null;
  let amountPaise: number | null = null;
  if (c.kind === "percent") {
    percent = Number(c.value);
    if (!Number.isInteger(percent) || percent < 1 || percent > 90) return fail("% off is a whole number from 1 to 90.");
  } else {
    amountPaise = rupeesToPaise(c.value);
    if (!amountPaise || Number.isNaN(amountPaise) || amountPaise <= 0) return fail("Set the ₹ off, like 20.");
  }
  const minOrderPaise = c.minOrder ? rupeesToPaise(c.minOrder) : 0;
  if (minOrderPaise === null || Number.isNaN(minOrderPaise)) return fail("Minimum order is an amount like 150, or blank.");
  const maxUses = c.maxUses ? Number(c.maxUses) : null;
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) return fail("Max uses is a whole number, or blank for no limit.");
  const startsAt = istInputToIso(str(f.startsAt, 40));
  const endsAt = istInputToIso(str(f.endsAt, 40));
  if (startsAt === undefined || endsAt === undefined) return fail("Pick start and end dates with the date picker, or leave them blank.");
  if (startsAt && endsAt && endsAt <= startsAt) return fail("The end has to be after the start.");
  try {
    await getStore().saveCoupon(
      {
        code: c.code,
        description: c.description,
        percent,
        amountPaise,
        minOrderPaise,
        maxUses,
        startsAt,
        endsAt,
        source: cleanSource(c.source),
        active: f.active,
      },
      c.isNew === "1",
    );
  } catch (err) {
    return fail(errorText(err));
  }
  revalidatePath("/admin/coupons");
  return { ok: true, message: c.isNew === "1" ? `Code ${c.code} added.` : "Saved.", id: c.code };
}

export async function deleteCoupon(codeRaw: string): Promise<OpResult> {
  const code = normalizeCode(codeRaw);
  if (COUPON_CODE_RE.test(code)) await getStore().deleteCoupon(code);
  revalidatePath("/admin/coupons");
  return { ok: true, message: "Deleted." };
}

// Custom requests -----------------------------------------------------

export async function updateCustomRequest(raw: unknown): Promise<OpResult> {
  const parsed = z
    .object({ number: z.string().regex(CUSTOM_NUMBER_RE), status: z.enum(CUSTOM_STATUSES), adminNote: z.string().trim().max(2000) })
    .safeParse(raw);
  if (!parsed.success) return fail("Check the fields.");
  const { number, ...patch } = parsed.data;
  await getStore().updateCustomRequest(number, patch);
  revalidatePath(`/admin/custom/${number}`);
  revalidatePath("/admin/custom");
  return { ok: true, message: "Saved." };
}

// Settings ------------------------------------------------------------

/** The settings form's text fields, plus storeOpen. */
export type SettingsFields = Record<string, unknown> & { storeOpen: boolean };

export async function saveSettings(f: SettingsFields): Promise<OpResult> {
  const text = (k: string, max = 300) => str(f[k], max);
  const instagramHandle = cleanHandle(text("instagramHandle", 120));
  if (!INSTAGRAM_HANDLE_RE.test(instagramHandle)) return fail("Enter the Instagram username, like stixnvibes.");

  const freeAbove = rupeesToPaise(text("freeShippingAbove", 12));
  if (Number.isNaN(freeAbove)) return fail("Free shipping amount must be a number like 250, or blank.");

  const upiId = text("upiId", 100).replace(/\s/g, "");
  if (upiId && !UPI_ID_RE.test(upiId)) return fail("UPI ID should look like yourname@okicici, or leave it blank.");

  const whatsappText = text("whatsappNumber", 20);
  const whatsappNumber = whatsappText ? normalizePhone(whatsappText) : "";
  if (whatsappNumber === null) return fail("WhatsApp number should be a 10-digit Indian mobile number, or blank.");

  const markupText = text("mrpMarkupPercent", 3);
  const markup = markupText === "" ? null : Number(markupText);
  if (markup !== null && (!Number.isInteger(markup) || markup < 0 || markup > 100)) return fail("MRP markup is a whole % from 0 to 100, or blank.");

  const store = getStore();
  const settings: Settings = {
    // Costs and the goal are saved from their own form; keep them as they are.
    ...(await store.getSettings()),
    storeOpen: f.storeOpen,
    announcement: text("announcement", 200),
    instagramHandle,
    orderNote: text("orderNote", 300),
    deliveryNote: text("deliveryNote", 200),
    bulkNote: text("bulkNote", 300),
    freeShippingAbovePaise: freeAbove,
    upiId,
    upiName: text("upiName", 60) || "Stix N Vibes",
    whatsappNumber,
    mrpMarkupPercent: markup,
  };
  await store.saveSettings(settings);
  refreshShop();
  return { ok: true, message: "Settings saved." };
}

// Stalls ----------------------------------------------------------------

const rupees = (v: string) => {
  const p = rupeesToPaise(v);
  return p === null ? 0 : p;
};

const stallSchema = z.object({
  name: z.string().trim().min(1, "Name the stall, like WordsUp fest.").max(120),
  date: z.string().regex(dateRe, "Pick the date."),
  venue: z.string().trim().max(160),
  collegeId: z.string().max(64),
  fee: z.string().trim().max(12),
  otherCosts: z.string().trim().max(12),
  notes: z.string().trim().max(2000),
});

/** The stall form's text fields, plus public. */
export type StallFields = Record<string, unknown> & { public: boolean };

export async function saveStall(f: StallFields, id: string | null): Promise<OpResult> {
  const parsed = stallSchema.safeParse(f);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const s = parsed.data;
  const feePaise = rupees(s.fee);
  const otherCostsPaise = rupees(s.otherCosts);
  if (Number.isNaN(feePaise) || Number.isNaN(otherCostsPaise)) return fail("Fee and other costs are amounts like 1500, or blank.");
  let savedId: string;
  try {
    const saved = await getStore().saveStall(id, {
      name: s.name,
      date: s.date,
      venue: s.venue,
      collegeId: s.collegeId || null,
      feePaise,
      otherCostsPaise,
      notes: s.notes,
      public: f.public,
    });
    savedId = saved.id;
  } catch (err) {
    return fail(errorText(err));
  }
  revalidatePath("/admin/stalls");
  revalidatePath("/", "layout");
  revalidatePath(`/admin/stalls/${savedId}`);
  return { ok: true, message: "Saved.", id: savedId };
}

export async function deleteStall(id: string): Promise<OpResult> {
  if (id) await getStore().deleteStall(id);
  revalidatePath("/", "layout");
  revalidatePath("/admin/stalls");
  return { ok: true, message: "Deleted." };
}

/** Removes a sale rung up by mistake and puts its stock back. */
export async function voidStallSale(id: string): Promise<OpResult> {
  if (!SALE_ID_RE.test(id)) return fail("Unknown sale.");
  try {
    await getStore().voidStallSale(id);
  } catch (err) {
    return fail(errorText(err));
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Sale removed." };
}

// Unit costs and goal ---------------------------------------------------

const costEntry = z.object({
  key: z.string().regex(/^[a-z-]+(:[a-z0-9-]{1,40})?$/),
  value: z.string().trim().max(12),
});

export async function saveCosts(input: { costs: unknown; goal: string; goalStart: string; goalBy: string }): Promise<OpResult> {
  const entries = z.array(costEntry).max(200).safeParse(input.costs);
  if (!entries.success) return fail("Check the costs.");
  const unitCosts: Record<string, number> = {};
  for (const e of entries.data) {
    const type = e.key.split(":")[0];
    if (!(PRODUCT_TYPE_IDS as readonly string[]).includes(type)) continue;
    if (e.value === "") continue;
    const p = rupeesToPaise(e.value);
    if (p === null || Number.isNaN(p)) return fail(`"${e.value}" isn't an amount. Use numbers like 5 or 2.50.`);
    unitCosts[costKey(type, e.key.split(":")[1])] = p;
  }

  const goalText = input.goal.trim();
  const goalPaise = goalText ? rupeesToPaise(goalText) : null;
  if (goalPaise !== null && Number.isNaN(goalPaise)) return fail("The goal is an amount like 300000, or blank.");
  const { goalStart, goalBy } = input;
  if (!dateRe.test(goalStart) || !dateRe.test(goalBy) || goalBy < goalStart) return fail("Pick a start date and an end date after it.");

  const store = getStore();
  await store.saveSettings({ ...(await store.getSettings()), unitCosts, goalPaise, goalStart, goalBy });
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  return { ok: true, message: "Costs saved." };
}

// Blog ------------------------------------------------------------------

const postSchema = z.object({
  title: z.string().trim().min(1, "Add a title.").max(160),
  slug: z.string().trim().toLowerCase().regex(slugRe, "Link name: lowercase letters, numbers and dashes only."),
  excerpt: z.string().trim().max(300),
  body: z.string().max(60_000, "The post is too long. Split it in two."),
  cover: image,
  tags: z.string().max(300),
  status: z.enum(POST_STATUSES),
});

export async function savePost(raw: unknown, id: string | null): Promise<OpResult> {
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const p = parsed.data;
  const store = getStore();
  let savedId: string;
  try {
    const before = id ? await store.getPost(id) : null;
    const saved = await store.savePost(id, {
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      body: p.body,
      cover: p.cover,
      tags: tagList(p.tags),
      status: p.status,
      // Keeps the first publish date, so editing doesn't bump it to the top.
      publishedAt: p.status === "published" ? (before?.publishedAt ?? new Date().toISOString()) : (before?.publishedAt ?? null),
    });
    savedId = saved.id;
  } catch (err) {
    return fail(errorText(err));
  }
  refreshShop();
  return { ok: true, message: p.status === "published" ? "Saved and live." : "Saved as a draft.", id: savedId };
}

export async function deletePost(id: string): Promise<OpResult> {
  if (id) await getStore().deletePost(id);
  refreshShop();
  return { ok: true, message: "Deleted." };
}

// Photo library ---------------------------------------------------------

const galleryFields = z.object({
  caption: z.string().trim().max(300),
  stallId: z.string().max(64),
  collegeId: z.string().max(64),
  tags: z.string().max(300),
  takenOn: z.union([z.literal(""), z.string().regex(dateRe)]),
  visible: z.boolean(),
  sortOrder: z.coerce.number().int().min(-9999).max(9999),
});

/** Adds photos already uploaded (their URLs), all with the same stall, college and tags. */
export async function addGallery(raw: unknown): Promise<OpResult> {
  const parsed = galleryFields.extend({ images: z.array(image).min(1, "Upload some photos first.").max(60) }).safeParse(raw);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const g = parsed.data;
  const store = getStore();
  for (const [i, src] of g.images.entries()) {
    await store.saveGalleryItem(null, {
      image: src,
      caption: g.caption,
      stallId: g.stallId || null,
      collegeId: g.collegeId || null,
      tags: tagList(g.tags),
      takenOn: g.takenOn || null,
      visible: g.visible,
      sortOrder: g.sortOrder + i,
    });
  }
  refreshShop();
  revalidatePath("/admin/gallery");
  return { ok: true, message: `Added ${g.images.length} photo${g.images.length === 1 ? "" : "s"}.` };
}

export async function saveGalleryItem(raw: unknown): Promise<OpResult> {
  const parsed = galleryFields.extend({ id: z.string().min(1).max(64), image }).safeParse(raw);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const g = parsed.data;
  try {
    await getStore().saveGalleryItem(g.id, {
      image: g.image,
      caption: g.caption,
      stallId: g.stallId || null,
      collegeId: g.collegeId || null,
      tags: tagList(g.tags),
      takenOn: g.takenOn || null,
      visible: g.visible,
      sortOrder: g.sortOrder,
    });
  } catch (err) {
    return fail(errorText(err));
  }
  refreshShop();
  revalidatePath("/admin/gallery");
  return { ok: true, message: "Saved.", id: g.id };
}

export async function deleteGalleryItem(id: string): Promise<OpResult> {
  if (id) await getStore().deleteGalleryItem(id);
  refreshShop();
  revalidatePath("/admin/gallery");
  return { ok: true, message: "Deleted." };
}

// Colleges --------------------------------------------------------------

const collegeSchema = z.object({
  name: z.string().trim().min(1, "Add the college name.").max(120),
  slug: z.string().trim().toLowerCase().regex(slugRe, "Link name: lowercase letters, numbers and dashes only."),
  area: z.string().trim().max(80),
  description: z.string().trim().max(1000),
  image,
  couponCode: z.string().max(20),
  productIds: z.array(z.string().max(64)).max(24),
  active: z.boolean(),
  sortOrder: z.coerce.number().int().min(-9999).max(9999),
});

export async function saveCollege(raw: unknown, id: string | null): Promise<OpResult> {
  const parsed = collegeSchema.safeParse(raw);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const c = parsed.data;
  const code = c.couponCode ? normalizeCode(c.couponCode) : "";
  if (code && !COUPON_CODE_RE.test(code)) return fail("Pick one of your codes, or none.");
  let savedId: string;
  try {
    const saved = await getStore().saveCollege(id, { ...c, couponCode: code });
    savedId = saved.id;
  } catch (err) {
    return fail(errorText(err));
  }
  refreshShop();
  revalidatePath("/admin/colleges");
  return { ok: true, message: "Saved.", id: savedId };
}

export async function deleteCollege(id: string): Promise<OpResult> {
  if (id) await getStore().deleteCollege(id);
  refreshShop();
  revalidatePath("/admin/colleges");
  return { ok: true, message: "Deleted." };
}
