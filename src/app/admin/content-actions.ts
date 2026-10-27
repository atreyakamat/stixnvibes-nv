"use server";

import { redirect } from "next/navigation";
import * as ops from "@/lib/admin/ops";
import { requireAdmin } from "@/lib/admin/session";
import type { FormState } from "./actions";

// Admin actions for the blog, the photo library and college pages. The
// rules are in lib/admin/ops.ts.

const state = (r: ops.OpResult): FormState => (r.ok ? { ok: true, message: r.message } : { error: r.error });

function parsePayload(form: FormData): unknown {
  try {
    return JSON.parse(String(form.get("payload") ?? ""));
  } catch {
    return null;
  }
}

// Blog ------------------------------------------------------------------

export async function savePostAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(form.get("id") ?? "") || null;
  const r = await ops.savePost(parsePayload(form), id);
  if (r.ok && !id) redirect(`/admin/blog/${r.id}?saved=1`);
  return state(r);
}

export async function deletePostAction(form: FormData) {
  await requireAdmin();
  await ops.deletePost(String(form.get("id") ?? ""));
  redirect("/admin/blog");
}

// Photo library ---------------------------------------------------------

/** Adds photos already uploaded (their URLs), all with the same stall, college and tags. */
export async function addGalleryAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  return state(await ops.addGallery(parsePayload(form)));
}

export async function saveGalleryItemAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  return state(await ops.saveGalleryItem(parsePayload(form)));
}

export async function deleteGalleryItemAction(form: FormData) {
  await requireAdmin();
  await ops.deleteGalleryItem(String(form.get("id") ?? ""));
}

// Colleges --------------------------------------------------------------

export async function saveCollegeAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(form.get("id") ?? "") || null;
  const r = await ops.saveCollege(parsePayload(form), id);
  if (r.ok && !id) redirect(`/admin/colleges/${r.id}?saved=1`);
  return state(r);
}

export async function deleteCollegeAction(form: FormData) {
  await requireAdmin();
  await ops.deleteCollege(String(form.get("id") ?? ""));
  redirect("/admin/colleges");
}
