"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/session";
import { safeUrl } from "@/lib/markdown";
import { COUPON_CODE_RE, normalizeCode } from "@/lib/pricing";
import { getStore } from "@/lib/store";
import { POST_STATUSES } from "@/lib/types";
import type { FormState } from "./actions";

// Admin actions for the blog, the photo library and college pages.

const slugRe = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const dateRe = /^\d{4}-\d{2}-\d{2}$/;
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

function parsePayload(form: FormData): unknown {
  try {
    return JSON.parse(String(form.get("payload") ?? ""));
  } catch {
    return null;
  }
}

function refresh() {
  revalidatePath("/", "layout");
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

export async function savePostAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = postSchema.safeParse(parsePayload(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
  const p = parsed.data;
  const id = String(form.get("id") ?? "") || null;
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
    return { error: (err as Error).message };
  }
  refresh();
  if (!id) redirect(`/admin/blog/${savedId}?saved=1`);
  return { ok: true, message: p.status === "published" ? "Saved and live." : "Saved as a draft." };
}

export async function deletePostAction(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  if (id) await getStore().deletePost(id);
  refresh();
  redirect("/admin/blog");
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
export async function addGalleryAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = galleryFields.extend({ images: z.array(image).min(1, "Upload some photos first.").max(60) }).safeParse(parsePayload(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
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
  refresh();
  revalidatePath("/admin/gallery");
  return { ok: true, message: `Added ${g.images.length} photo${g.images.length === 1 ? "" : "s"}.` };
}

export async function saveGalleryItemAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = galleryFields.extend({ id: z.string().min(1).max(64), image }).safeParse(parsePayload(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
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
    return { error: (err as Error).message };
  }
  refresh();
  revalidatePath("/admin/gallery");
  return { ok: true, message: "Saved." };
}

export async function deleteGalleryItemAction(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  if (id) await getStore().deleteGalleryItem(id);
  refresh();
  revalidatePath("/admin/gallery");
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

export async function saveCollegeAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = collegeSchema.safeParse(parsePayload(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
  const c = parsed.data;
  const code = c.couponCode ? normalizeCode(c.couponCode) : "";
  if (code && !COUPON_CODE_RE.test(code)) return { error: "Pick one of your codes, or none." };
  const id = String(form.get("id") ?? "") || null;
  let savedId: string;
  try {
    const saved = await getStore().saveCollege(id, { ...c, couponCode: code });
    savedId = saved.id;
  } catch (err) {
    return { error: (err as Error).message };
  }
  refresh();
  revalidatePath("/admin/colleges");
  if (!id) redirect(`/admin/colleges/${savedId}?saved=1`);
  return { ok: true, message: "Saved." };
}

export async function deleteCollegeAction(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  if (id) await getStore().deleteCollege(id);
  refresh();
  redirect("/admin/colleges");
}
