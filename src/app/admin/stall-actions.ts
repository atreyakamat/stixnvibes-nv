"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/session";
import { costKey } from "@/lib/costs";
import { rupeesToPaise } from "@/lib/money";
import { ORDER_NUMBER_RE } from "@/lib/constants";
import { setOrderStatus } from "@/lib/orders";
import { cleanTracking, TRACKING_RE } from "@/lib/shipping";
import { SALE_ID_RE } from "@/lib/stall";
import { getStore } from "@/lib/store";
import { PRODUCT_TYPE_IDS } from "@/lib/types";
import type { FormState } from "./actions";

// Admin actions for v7: stalls, stall sales, unit costs and the goal,
// shipping. Content (blog, library, colleges) is in content-actions.ts.

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const rupees = (v: string) => {
  const p = rupeesToPaise(v);
  return p === null ? 0 : p;
};

// Stalls ----------------------------------------------------------------

const stallSchema = z.object({
  name: z.string().trim().min(1, "Name the stall, like WordsUp fest.").max(120),
  date: z.string().regex(dateRe, "Pick the date."),
  venue: z.string().trim().max(160),
  collegeId: z.string().max(64),
  fee: z.string().trim().max(12),
  otherCosts: z.string().trim().max(12),
  notes: z.string().trim().max(2000),
});

export async function saveStallAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = stallSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
  const s = parsed.data;
  const feePaise = rupees(s.fee);
  const otherCostsPaise = rupees(s.otherCosts);
  if (Number.isNaN(feePaise) || Number.isNaN(otherCostsPaise)) return { error: "Fee and other costs are amounts like 1500, or blank." };
  const id = String(form.get("id") ?? "") || null;
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
      public: form.get("public") === "on",
    });
    savedId = saved.id;
  } catch (err) {
    return { error: (err as Error).message };
  }
  revalidatePath("/admin/stalls");
  revalidatePath("/", "layout");
  if (!id) redirect(`/admin/stalls/${savedId}`);
  revalidatePath(`/admin/stalls/${savedId}`);
  return { ok: true, message: "Saved." };
}

export async function deleteStallAction(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  if (id) await getStore().deleteStall(id);
  revalidatePath("/", "layout");
  redirect("/admin/stalls");
}

/** Removes a sale rung up by mistake and puts its stock back. */
export async function voidStallSaleAction(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!SALE_ID_RE.test(id)) return { ok: false, error: "Unknown sale." };
  try {
    await getStore().voidStallSale(id);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function voidStallSaleFormAction(form: FormData) {
  const id = String(form.get("id") ?? "");
  await voidStallSaleAction(id);
  const stallId = String(form.get("stallId") ?? "");
  if (stallId) revalidatePath(`/admin/stalls/${stallId}`);
}

// Unit costs and goal ---------------------------------------------------

const costEntry = z.object({
  key: z.string().regex(/^[a-z-]+(:[a-z0-9-]{1,40})?$/),
  value: z.string().trim().max(12),
});

export async function saveCostsAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("costs") ?? "[]"));
  } catch {
    return { error: "Invalid form." };
  }
  const entries = z.array(costEntry).max(200).safeParse(raw);
  if (!entries.success) return { error: "Check the costs." };
  const unitCosts: Record<string, number> = {};
  for (const e of entries.data) {
    const type = e.key.split(":")[0];
    if (!(PRODUCT_TYPE_IDS as readonly string[]).includes(type)) continue;
    if (e.value === "") continue;
    const p = rupeesToPaise(e.value);
    if (p === null || Number.isNaN(p)) return { error: `"${e.value}" isn't an amount. Use numbers like 5 or 2.50.` };
    unitCosts[costKey(type, e.key.split(":")[1])] = p;
  }

  const goalText = String(form.get("goal") ?? "").trim();
  const goalPaise = goalText ? rupeesToPaise(goalText) : null;
  if (goalPaise !== null && Number.isNaN(goalPaise)) return { error: "The goal is an amount like 300000, or blank." };
  const goalStart = String(form.get("goalStart") ?? "");
  const goalBy = String(form.get("goalBy") ?? "");
  if (!dateRe.test(goalStart) || !dateRe.test(goalBy) || goalBy < goalStart) return { error: "Pick a start date and an end date after it." };

  const store = getStore();
  await store.saveSettings({ ...(await store.getSettings()), unitCosts, goalPaise, goalStart, goalBy });
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  return { ok: true, message: "Costs saved." };
}

// Shipping --------------------------------------------------------------

export async function shipOrderAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const number = String(form.get("number") ?? "");
  const tracking = cleanTracking(String(form.get("trackingNumber") ?? ""));
  if (!ORDER_NUMBER_RE.test(number)) return { error: "Unknown order." };
  if (tracking && !TRACKING_RE.test(tracking)) return { error: "The tracking number should be letters and digits, like EE123456789IN." };
  const store = getStore();
  try {
    await store.updateOrder(number, { trackingNumber: tracking });
    if (form.get("markShipped") === "1") await setOrderStatus(number, "shipped");
  } catch (err) {
    return { error: (err as Error).message };
  }
  revalidatePath("/admin/packing");
  revalidatePath(`/admin/orders/${number}`);
  revalidatePath("/admin/orders");
  return { ok: true, message: form.get("markShipped") === "1" ? "Marked shipped." : "Saved." };
}
