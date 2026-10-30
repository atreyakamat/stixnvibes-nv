"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/admin/actions";
import { deleteReviewAction, saveReviewAction } from "@/app/admin/review-actions";
import { REVIEW_TEXT_MAX, type Review } from "@/lib/types";

const STATUS_LABEL = { pending: "Waiting", published: "Live", hidden: "Hidden" } as const;

export function ReviewCard({ review: r, productName, when }: { review: Review; productName: string; when: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveReviewAction, {});
  return (
    <article className="space-y-4 rounded-2xl border border-line p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-medium">
            <span className="text-lemon" aria-label={`${r.rating} out of 5`}>
              {"★".repeat(r.rating)}
              <span className="text-paper/20">{"★".repeat(5 - r.rating)}</span>
            </span>{" "}
            {r.name}
            {r.instagram && <span className="text-mute"> · @{r.instagram}</span>}
            {r.orderNumber && <span className="ml-2 rounded-full bg-lemon/15 px-2 py-0.5 text-xs text-lemon">Verified · {r.orderNumber}</span>}
          </p>
          <p className="text-sm text-mute">
            {productName} · {when}
          </p>
        </div>
        <span className="rounded-full border border-line px-2.5 py-0.5 text-xs">{STATUS_LABEL[r.status]}</span>
      </header>
      {r.text && <p className="whitespace-pre-line text-paper/90">{r.text}</p>}
      {r.photos.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {r.photos.map((id, i) => (
            <li key={id}>
              <a href={`/u/${id}`} target="_blank" rel="noopener" className="block size-24 overflow-hidden rounded-xl bg-paper/5">
                <img src={`/u/${id}`} alt={`Photo ${i + 1} from ${r.name}`} className="size-full object-cover" />
              </a>
            </li>
          ))}
        </ul>
      )}
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={r.id} />
        <label className="block">
          <span className="mb-1.5 block text-sm text-paper/70">Your public reply (shows under the review)</span>
          <textarea name="reply" defaultValue={r.reply} maxLength={REVIEW_TEXT_MAX} className="field min-h-20" />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {r.status !== "published" && (
            <button type="submit" name="status" value="published" className="btn btn-primary !py-2 disabled:opacity-50" disabled={pending}>
              Publish
            </button>
          )}
          <button type="submit" className="btn btn-ghost !py-2 disabled:opacity-50" disabled={pending}>
            Save reply
          </button>
          {r.status !== "hidden" && (
            <button type="submit" name="status" value="hidden" className="btn btn-ghost !py-2 disabled:opacity-50" disabled={pending}>
              Hide
            </button>
          )}
          <button
            type="submit"
            formAction={deleteReviewAction}
            className="ml-auto text-sm text-mute hover:text-[#ff7a59]"
            onClick={(e) => {
              if (!confirm("Delete this review for good?")) e.preventDefault();
            }}
          >
            Delete
          </button>
          <span role="status" className="text-sm">
            {state.error ? <span className="text-[#ff7a59]">{state.error}</span> : <span className="text-lemon">{state.message}</span>}
          </span>
        </div>
      </form>
    </article>
  );
}
