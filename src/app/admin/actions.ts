"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { login, logout, requireAdmin } from "@/lib/admin/session";
import { ORDER_NUMBER_RE } from "@/lib/constants";
import { rupeesToPaise } from "@/lib/money";
import { rateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";
import { TEMPLATES } from "@/lib/store/seed";
import type { ProductInput } from "@/lib/store/types";
import { CUSTOM_FIELD_KINDS, ORDER_STATUSES, PRODUCT_STATUSES, PRODUCT_TYPE_IDS, type Product, type Settings } from "@/lib/types";

export type FormState = { ok?: boolean; error?: string; message?: string };

function refreshShop() {
  // Storefront pages are cached for 60s; changes in admin show at once.
  revalidatePath("/", "layout");
}

const slugRe = /^[a-z0-9]+(-[a-z0-9]+)*$/;
function toSlug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Auth ----------------------------------------------------------------

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("admin-login", 8, 15 * 60_000))) return { error: "Too many attempts. Wait 15 minutes." };
  const res = await login(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
  if (!res.ok) return { error: res.error };
  redirect("/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}

// Orders --------------------------------------------------------------

const orderUpdateSchema = z.object({
  number: z.string().regex(ORDER_NUMBER_RE),
  status: z.enum(ORDER_STATUSES),
  adminNote: z.string().trim().max(2000),
});

export async function updateOrderAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = orderUpdateSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Check the fields." };
  const { number, ...patch } = parsed.data;
  try {
    await getStore().updateOrder(number, patch);
  } catch (err) {
    return { error: (err as Error).message };
  }
  revalidatePath(`/admin/orders/${number}`);
  revalidatePath("/admin/orders");
  return { ok: true, message: "Saved." };
}

export async function quickOrderStatusAction(form: FormData) {
  await requireAdmin();
  const number = String(form.get("number") ?? "");
  const status = z.enum(ORDER_STATUSES).safeParse(form.get("status"));
  if (!ORDER_NUMBER_RE.test(number) || !status.success) return;
  await getStore().updateOrder(number, { status: status.data });
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

// Products ------------------------------------------------------------

const idRe = /^[a-z0-9-]{1,40}$/;
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
});

function editable(p: Product): ProductInput {
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
    options: p.options,
    customFields: p.customFields,
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
    options: p.options.map((g) => ({ id: g.id, name: g.name, values: g.values.map((v) => ({ id: v.id, label: v.label, priceDeltaPaise: v.delta })) })),
    customFields: p.customFields,
  };
}

export async function saveProductAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("payload") ?? ""));
  } catch {
    return { error: "Invalid form." };
  }
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
  const input = toProductInput(parsed.data);
  for (const g of input.options) {
    if (new Set(g.values.map((v) => v.id)).size !== g.values.length) return { error: `"${g.name}" has two choices with the same name.` };
  }

  const id = form.get("id");
  let savedId: string;
  try {
    const store = getStore();
    const saved = typeof id === "string" && id ? await store.updateProduct(id, input) : await store.createProduct(input);
    savedId = saved.id;
  } catch (err) {
    return { error: (err as Error).message };
  }
  refreshShop();
  revalidatePath("/admin/products");
  if (!id) redirect(`/admin/products/${savedId}?saved=1`);
  return { ok: true, message: "Saved." };
}

export async function uploadProductImageAction(form: FormData): Promise<{ url?: string; error?: string }> {
  await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image." };
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return { error: "Use PNG, JPG or WebP." };
  if (file.size > 5 * 1024 * 1024) return { error: "Images can be up to 5 MB." };
  try {
    return { url: await getStore().uploadProductImage(file) };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function deleteProductAction(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  if (id) await getStore().deleteProduct(id);
  refreshShop();
  redirect("/admin/products");
}

/** Quick toggles from the product list: live / hidden / sold out / featured. */
export async function quickProductAction(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  const op = String(form.get("op") ?? "");
  const store = getStore();
  const p = await store.getProduct(id);
  if (!p) return;
  const input = editable(p);
  if (op === "live" || op === "hidden" || op === "upcoming") input.status = op;
  else if (op === "soldOut") input.soldOut = !input.soldOut;
  else if (op === "featured") input.featured = !input.featured;
  else return;
  await store.updateProduct(id, input);
  refreshShop();
  revalidatePath("/admin/products");
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

export async function bulkCreateAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("payload") ?? ""));
  } catch {
    return { error: "Invalid form." };
  }
  const parsed = bulkSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
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
      options: structuredClone(t.options),
      customFields: structuredClone(t.customFields),
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

export async function saveCollectionAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("payload") ?? ""));
  } catch {
    return { error: "Invalid form." };
  }
  const parsed = collectionSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
  const { productIds, ...input } = parsed.data;
  const id = form.get("id");
  const store = getStore();
  let savedId: string;
  try {
    const saved = typeof id === "string" && id ? await store.updateCollection(id, input) : await store.createCollection(input);
    savedId = saved.id;
    // Sync membership: add to picked products, remove from the rest.
    const wanted = new Set(productIds);
    for (const p of await store.listProducts({ includeHidden: true })) {
      const has = p.collectionIds.includes(savedId);
      if (has === wanted.has(p.id)) continue;
      const rest = editable(p);
      rest.collectionIds = has ? rest.collectionIds.filter((c) => c !== savedId) : [...rest.collectionIds, savedId];
      await store.updateProduct(p.id, rest);
    }
  } catch (err) {
    return { error: (err as Error).message };
  }
  refreshShop();
  revalidatePath("/admin/collections");
  if (!id) redirect(`/admin/collections/${savedId}?saved=1`);
  return { ok: true, message: "Saved." };
}

export async function deleteCollectionAction(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  if (id) await getStore().deleteCollection(id);
  refreshShop();
  redirect("/admin/collections");
}

// Offers --------------------------------------------------------------

const offerSchema = z.object({
  id: z.string().max(64).optional(),
  name: z.string().trim().min(1, "Name the offer.").max(80),
  description: z.string().trim().max(200),
  productType: z.union([z.literal(""), z.enum(PRODUCT_TYPE_IDS)]),
  buy: z.coerce.number().int().min(1, "Buy must be at least 1.").max(100),
  free: z.coerce.number().int().min(1, "Free must be at least 1.").max(100),
  sortOrder: z.coerce.number().int().min(-999).max(999),
});

export async function saveOfferAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = offerSchema.safeParse({ ...Object.fromEntries(form), sortOrder: form.get("sortOrder") || 0 });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
  const { id, productType, ...rest } = parsed.data;
  await getStore().saveOffer(id || null, { ...rest, productType: productType || null, active: form.get("active") === "on" });
  refreshShop();
  revalidatePath("/admin/offers");
  return { ok: true, message: "Saved." };
}

export async function deleteOfferAction(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  if (id) await getStore().deleteOffer(id);
  refreshShop();
  revalidatePath("/admin/offers");
}

// Settings ------------------------------------------------------------

export async function saveSettingsAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const text = (k: string, max = 300) => String(form.get(k) ?? "").trim().slice(0, max);
  const digits = text("whatsappNumber", 20).replace(/\D/g, "");
  const whatsappNumber = digits.length === 10 ? `91${digits}` : digits;
  if (!/^\d{11,15}$/.test(whatsappNumber)) return { error: "Enter the WhatsApp number with country code, like 91 77440 20601." };

  const settings: Settings = {
    storeOpen: form.get("storeOpen") === "on",
    announcement: text("announcement", 200),
    whatsappNumber,
    orderNote: text("orderNote", 300),
    deliveryNote: text("deliveryNote", 200),
    bulkNote: text("bulkNote", 300),
  };
  await getStore().saveSettings(settings);
  refreshShop();
  return { ok: true, message: "Settings saved." };
}
