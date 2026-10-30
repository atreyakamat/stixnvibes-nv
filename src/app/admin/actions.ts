"use server";

import { redirect } from "next/navigation";
import * as ops from "@/lib/admin/ops";
import { login, logout, requireAdmin } from "@/lib/admin/session";
import { clearRateLimit, rateLimit } from "@/lib/rate-limit";

// Server actions for the web admin. The rules live in lib/admin/ops.ts,
// shared with the admin app's API; these turn form posts into ops calls.

export type FormState = { ok?: boolean; error?: string; message?: string };

/** An ops result as form state. */
function asState(r: ops.OpResult): FormState {
  return r.ok ? { ok: true, message: r.message } : { error: r.error };
}

function payload(form: FormData): unknown {
  try {
    return JSON.parse(String(form.get("payload") ?? ""));
  } catch {
    return null;
  }
}

const idOf = (form: FormData) => {
  const id = form.get("id");
  return typeof id === "string" && id ? id : null;
};

// Auth ----------------------------------------------------------------

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("admin-login", 8, 15 * 60_000))) return { error: "Too many attempts. Wait 15 minutes." };
  const res = await login(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
  if (!res.ok) return { error: res.error };
  // Only failed attempts should count towards the limit.
  await clearRateLimit("admin-login");
  redirect("/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}

// Orders --------------------------------------------------------------

export async function updateOrderAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  return asState(await ops.updateOrder(Object.fromEntries(form)));
}

export async function quickOrderStatusAction(form: FormData) {
  await requireAdmin();
  await ops.quickOrderStatus(String(form.get("number") ?? ""), form.get("status"));
}

// Products ------------------------------------------------------------

export async function saveProductAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const raw = payload(form);
  if (raw === null) return { error: "Invalid form." };
  const id = idOf(form);
  const r = await ops.saveProduct(raw, id);
  if (r.ok && !id) redirect(`/admin/products/${r.id}?saved=1`);
  return asState(r);
}

export async function uploadProductImageAction(form: FormData): Promise<{ url?: string; error?: string }> {
  await requireAdmin();
  return ops.uploadProductImage(form.get("file"));
}

export async function deleteProductAction(form: FormData) {
  await requireAdmin();
  await ops.deleteProduct(String(form.get("id") ?? ""));
  redirect("/admin/products");
}

/** Quick toggles from the product list: live / hidden / sold out / featured. */
export async function quickProductAction(form: FormData) {
  await requireAdmin();
  const op = String(form.get("op") ?? "");
  if (!(ops.QUICK_PRODUCT_OPS as readonly string[]).includes(op)) return;
  await ops.quickProduct(String(form.get("id") ?? ""), op);
}

export async function bulkCreateAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const raw = payload(form);
  if (raw === null) return { error: "Invalid form." };
  return asState(await ops.bulkCreate(raw));
}

// Collections ---------------------------------------------------------

export async function saveCollectionAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const raw = payload(form);
  if (raw === null) return { error: "Invalid form." };
  const id = idOf(form);
  const r = await ops.saveCollection(raw, id);
  if (r.ok && !id) redirect(`/admin/collections/${r.id}?saved=1`);
  return asState(r);
}

export async function deleteCollectionAction(form: FormData) {
  await requireAdmin();
  await ops.deleteCollection(String(form.get("id") ?? ""));
  redirect("/admin/collections");
}

// Offers --------------------------------------------------------------

export async function saveOfferAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  return asState(await ops.saveOffer({ ...Object.fromEntries(form), active: form.get("active") === "on" }));
}

export async function deleteOfferAction(form: FormData) {
  await requireAdmin();
  await ops.deleteOffer(String(form.get("id") ?? ""));
}

// Coupons -------------------------------------------------------------

export async function saveCouponAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  return asState(await ops.saveCoupon({ ...Object.fromEntries(form), active: form.get("active") === "on" }));
}

export async function deleteCouponAction(form: FormData) {
  await requireAdmin();
  await ops.deleteCoupon(String(form.get("code") ?? ""));
}

// Custom requests -----------------------------------------------------

export async function updateCustomRequestAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  return asState(await ops.updateCustomRequest(Object.fromEntries(form)));
}

// Settings ------------------------------------------------------------

export async function saveSettingsAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  return asState(await ops.saveSettings({ ...Object.fromEntries(form), storeOpen: form.get("storeOpen") === "on" }));
}

