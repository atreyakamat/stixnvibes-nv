"use server";

import { moderateReview, removeReview } from "@/lib/admin/reviews";
import { requireAdmin } from "@/lib/admin/session";
import type { FormState } from "./actions";

export async function saveReviewAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  const status = form.get("status");
  const r = await moderateReview(id, { reply: String(form.get("reply") ?? ""), ...(status ? { status: String(status) } : {}) });
  return r.ok ? { ok: true, message: r.message } : { error: r.error };
}

export async function deleteReviewAction(form: FormData) {
  await requireAdmin();
  await removeReview(String(form.get("id") ?? ""));
}
