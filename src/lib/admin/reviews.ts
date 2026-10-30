import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { REVIEW_STATUSES, REVIEW_TEXT_MAX } from "@/lib/types";

// Admin changes to reviews: publish, hide, reply, delete. Used by the web
// admin's server actions and the admin app's API, so both follow the same
// rules. Callers check that the admin is signed in.

export type OpResult = { ok: true; message?: string } | { ok: false; error: string };

const REVIEW_ID_RE = /^[a-zA-Z0-9-]{1,64}$/;

const patchSchema = z
  .object({
    status: z.enum(REVIEW_STATUSES).optional(),
    reply: z.string().trim().max(REVIEW_TEXT_MAX, `Keep the reply under ${REVIEW_TEXT_MAX} characters.`).optional(),
  })
  .refine((p) => p.status !== undefined || p.reply !== undefined, "Nothing to change.");

function refresh() {
  // Product pages show published reviews and replies.
  revalidatePath("/", "layout");
  revalidatePath("/admin/reviews");
}

export async function moderateReview(id: string, raw: unknown): Promise<OpResult> {
  if (!REVIEW_ID_RE.test(id)) return { ok: false, error: "Review not found." };
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the fields." };
  const store = getStore();
  if (!(await store.getReview(id))) return { ok: false, error: "Review not found." };
  const r = await store.updateReview(id, parsed.data);
  refresh();
  const message = parsed.data.reply !== undefined && parsed.data.status === undefined ? "Reply saved." : r.status === "published" ? "Published." : r.status === "hidden" ? "Hidden." : "Saved.";
  return { ok: true, message };
}

export async function removeReview(id: string): Promise<OpResult> {
  if (!REVIEW_ID_RE.test(id)) return { ok: false, error: "Review not found." };
  await getStore().deleteReview(id);
  refresh();
  return { ok: true, message: "Deleted." };
}
