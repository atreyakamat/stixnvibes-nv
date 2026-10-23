"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { login, logout, requireAdmin } from "@/lib/admin/session";
import { rupeesToPaise } from "@/lib/money";
import { transitionOrder } from "@/lib/orders/service";
import { isValidVpa } from "@/lib/payments/upi";
import { rateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";
import type { ProductInput } from "@/lib/store/types";
import { CATEGORY_IDS, CUSTOM_STATUSES, ORDER_STATUSES, type Settings } from "@/lib/types";

export type FormState = { ok?: boolean; error?: string; message?: string };

function refreshShop() {
  // Storefront pages are cached for 60s; changes in admin show at once.
  revalidatePath("/", "layout");
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

const transitionSchema = z.object({
  number: z.string().regex(/^SNV-[A-Z0-9]{6}$/),
  to: z.enum(ORDER_STATUSES),
  note: z.string().max(300).optional(),
});

export async function transitionOrderAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = transitionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Invalid request." };
  try {
    await transitionOrder(parsed.data.number, parsed.data.to, parsed.data.note);
  } catch (err) {
    return { error: (err as Error).message };
  }
  revalidatePath(`/admin/orders/${parsed.data.number}`);
  refreshShop();
  return { ok: true };
}

const orderDetailsSchema = z.object({
  number: z.string().regex(/^SNV-[A-Z0-9]{6}$/),
  courier: z.string().trim().max(60),
  trackingNumber: z.string().trim().max(80),
  adminNote: z.string().trim().max(2000),
});

export async function saveOrderDetailsAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = orderDetailsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Check the fields." };
  const { number, courier, trackingNumber, adminNote } = parsed.data;
  try {
    await getStore().updateOrder(number, { courier: courier || null, trackingNumber: trackingNumber || null, adminNote });
  } catch (err) {
    return { error: (err as Error).message };
  }
  revalidatePath(`/admin/orders/${number}`);
  return { ok: true, message: "Saved." };
}

// Products ------------------------------------------------------------

const variantSchema = z.object({
  id: z.string().max(64).optional(),
  label: z.string().trim().min(1, "Every option needs a name.").max(60),
  price: z.string().trim().max(12),
  stock: z.string().trim().max(7),
  active: z.boolean(),
});

const productSchema = z.object({
  name: z.string().trim().min(1, "Add a name.").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Link name: lowercase letters, numbers and dashes only."),
  category: z.enum(CATEGORY_IDS),
  description: z.string().trim().max(2000),
  details: z.string().trim().max(2000),
  tags: z.string().trim().max(300),
  images: z.array(z.string().max(3_000_000)).max(8),
  active: z.boolean(),
  featured: z.boolean(),
  sortOrder: z.coerce.number().int().min(-9999).max(9999),
  variants: z.array(variantSchema).min(1, "Add at least one option.").max(20),
});

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
  const p = parsed.data;

  const variants: ProductInput["variants"] = [];
  for (const [i, v] of p.variants.entries()) {
    const price = rupeesToPaise(v.price);
    if (Number.isNaN(price)) return { error: `"${v.label}": price must be a number like 49 or 49.50.` };
    const stock = v.stock === "" ? null : Number(v.stock);
    if (stock !== null && (!Number.isInteger(stock) || stock < 0)) return { error: `"${v.label}": stock must be a whole number, or blank.` };
    variants.push({ ...(v.id ? { id: v.id } : {}), label: v.label, pricePaise: price, stock, active: v.active, sortOrder: i });
  }

  const input: ProductInput = {
    name: p.name,
    slug: p.slug,
    category: p.category,
    description: p.description,
    details: p.details,
    tags: p.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    images: p.images,
    active: p.active,
    featured: p.featured,
    sortOrder: p.sortOrder,
    variants,
  };

  const id = form.get("id");
  let savedId: string;
  try {
    const store = getStore();
    const saved = typeof id === "string" && id ? await store.updateProduct(id, input) : await store.createProduct(input);
    savedId = saved.id;
  } catch (err) {
    const msg = (err as Error).message;
    return { error: /duplicate|unique/i.test(msg) ? `Another product already uses the link "${p.slug}".` : msg };
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

// Custom requests -----------------------------------------------------

const customSchema = z.object({
  id: z.string().min(1).max(64),
  status: z.enum(CUSTOM_STATUSES),
  adminNote: z.string().trim().max(2000),
});

export async function updateCustomAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = customSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Invalid request." };
  try {
    await getStore().updateCustomRequest(parsed.data.id, { status: parsed.data.status, adminNote: parsed.data.adminNote });
  } catch (err) {
    return { error: (err as Error).message };
  }
  revalidatePath("/admin/custom");
  return { ok: true, message: "Saved." };
}

// Settings ------------------------------------------------------------

export async function saveSettingsAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const text = (k: string, max = 300) => String(form.get(k) ?? "").trim().slice(0, max);
  const flag = (k: string) => form.get(k) === "on";
  const money = (k: string) => rupeesToPaise(text(k, 12));

  const shippingFee = money("shippingFee");
  const freeAbove = money("freeShippingAbove");
  const minOrder = money("minOrder");
  if ([shippingFee, freeAbove, minOrder].some((v) => Number.isNaN(v))) return { error: "Amounts must be numbers like 49 or 499." };

  const settings: Settings = {
    storeOpen: flag("storeOpen"),
    announcement: text("announcement", 200),
    shippingEnabled: flag("shippingEnabled"),
    shippingFeePaise: shippingFee ?? 0,
    freeShippingAbovePaise: freeAbove,
    shipsTo: text("shipsTo", 120),
    dispatchNote: text("dispatchNote", 200),
    pickupEnabled: flag("pickupEnabled"),
    pickupNote: text("pickupNote", 200),
    upiEnabled: flag("upiEnabled"),
    upiVpa: text("upiVpa", 100),
    upiPayee: text("upiPayee", 50) || "Stix N Vibes",
    minOrderPaise: minOrder ?? 0,
  };

  if (settings.upiEnabled && !isValidVpa(settings.upiVpa)) return { error: "Enter a valid UPI ID, like stixnvibes@okaxis." };
  if (!settings.shippingEnabled && !settings.pickupEnabled && settings.storeOpen) {
    return { error: "Turn on shipping or pickup before opening the shop." };
  }
  if (settings.storeOpen && settings.shippingEnabled && !settings.upiEnabled) {
    return { error: "Shipped orders are paid by UPI. Turn on UPI, or turn off shipping." };
  }

  await getStore().saveSettings(settings);
  refreshShop();
  return { ok: true, message: "Settings saved." };
}
