import type { Metadata } from "next";
import Link from "next/link";
import { formatDate } from "@/components/admin/orders-table";
import { ReviewCard } from "@/components/admin/review-card";
import { requireAdmin } from "@/lib/admin/session";
import { getStore } from "@/lib/store";
import { REVIEW_STATUSES, type ReviewStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Reviews" };

const TABS: { status: ReviewStatus; label: string }[] = [
  { status: "pending", label: "Waiting" },
  { status: "published", label: "Live" },
  { status: "hidden", label: "Hidden" },
];

export default async function ReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  await requireAdmin();
  const want = (await searchParams).status;
  const status = REVIEW_STATUSES.find((s) => s === want) ?? "pending";
  const store = getStore();
  const [reviews, all, products] = await Promise.all([store.listReviews({ status }), store.listReviews({ limit: 2000 }), store.listProducts({ includeHidden: true })]);
  const names = new Map(products.map((p) => [p.id, p.name]));
  const count = (s: ReviewStatus) => all.filter((r) => r.status === s).length;
  const live = all.filter((r) => r.status === "published");
  const avg = live.length ? live.reduce((n, r) => n + r.rating, 0) / live.length : null;

  return (
    <div className="space-y-6">
      <h1 className="display text-5xl">Reviews</h1>
      <p className="max-w-2xl text-sm text-mute">
        New reviews wait here until you publish them, so no photo goes on the shop unchecked. Your reply shows under the review.
        {avg !== null && ` Live average: ${avg.toFixed(1)} from ${live.length}.`}
      </p>
      <nav aria-label="Review status" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.status}
            href={`/admin/reviews?status=${t.status}`}
            aria-current={t.status === status ? "page" : undefined}
            className={`rounded-full border px-4 py-1.5 text-sm ${t.status === status ? "border-lemon bg-lemon text-ink" : "border-line text-paper/80 hover:border-lemon"}`}
          >
            {t.label} ({count(t.status)})
          </Link>
        ))}
      </nav>
      {reviews.length === 0 ? (
        <p className="rounded-2xl border border-line p-6 text-paper/70">{status === "pending" ? "Nothing waiting. New reviews show up here." : "None here."}</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {reviews.map((r) => (
            <ReviewCard key={`${r.id}-${r.updatedAt}`} review={r} productName={names.get(r.productId) ?? "Deleted product"} when={formatDate(r.createdAt)} />
          ))}
        </div>
      )}
    </div>
  );
}
