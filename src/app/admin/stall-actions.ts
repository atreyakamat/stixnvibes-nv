"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as ops from "@/lib/admin/ops";
import { requireAdmin } from "@/lib/admin/session";
import type { FormState } from "./actions";

// Admin actions for v7: stalls, stall sales, unit costs and the goal,
// shipping. Content (blog, library, colleges) is in content-actions.ts.
// The rules are in lib/admin/ops.ts.

const state = (r: ops.OpResult): FormState => (r.ok ? { ok: true, message: r.message } : { error: r.error });

// Stalls ----------------------------------------------------------------

export async function saveStallAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(form.get("id") ?? "") || null;
  const r = await ops.saveStall({ ...Object.fromEntries(form), public: form.get("public") === "on" }, id);
  if (r.ok && !id) redirect(`/admin/stalls/${r.id}`);
  return state(r);
}

export async function deleteStallAction(form: FormData) {
  await requireAdmin();
  await ops.deleteStall(String(form.get("id") ?? ""));
  redirect("/admin/stalls");
}

/** Removes a sale rung up by mistake and puts its stock back. */
export async function voidStallSaleAction(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const r = await ops.voidStallSale(id);
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

export async function voidStallSaleFormAction(form: FormData) {
  const id = String(form.get("id") ?? "");
  await voidStallSaleAction(id);
  const stallId = String(form.get("stallId") ?? "");
  if (stallId) revalidatePath(`/admin/stalls/${stallId}`);
}

// Unit costs and goal ---------------------------------------------------

export async function saveCostsAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  let costs: unknown;
  try {
    costs = JSON.parse(String(form.get("costs") ?? "[]"));
  } catch {
    return { error: "Invalid form." };
  }
  return state(
    await ops.saveCosts({
      costs,
      goal: String(form.get("goal") ?? ""),
      goalStart: String(form.get("goalStart") ?? ""),
      goalBy: String(form.get("goalBy") ?? ""),
    }),
  );
}

// Shipping --------------------------------------------------------------

export async function shipOrderAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  return state(
    await ops.shipOrder({
      number: String(form.get("number") ?? ""),
      trackingNumber: String(form.get("trackingNumber") ?? ""),
      markShipped: form.get("markShipped") === "1",
    }),
  );
}
