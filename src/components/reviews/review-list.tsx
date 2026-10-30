import type { PublicReview } from "@/lib/app-api";

// Published reviews on a product page. Server-rendered; the photos open full
// size in a new tab.

export function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  const full = Math.round(rating);
  return (
    <span className={`tracking-[0.15em] ${className}`} aria-label={`${rating} out of 5 stars`}>
      <span className="text-lemon">{"★".repeat(full)}</span>
      <span className="text-paper/25">{"★".repeat(5 - full)}</span>
    </span>
  );
}

export function averageRating(reviews: Pick<PublicReview, "rating">[]) {
  return reviews.length ? Math.round((reviews.reduce((n, r) => n + r.rating, 0) / reviews.length) * 10) / 10 : 0;
}

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export function ReviewList({ reviews }: { reviews: PublicReview[] }) {
  if (!reviews.length) return <p className="text-paper/60">No reviews yet. Bought this? Be the first.</p>;
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {reviews.map((r) => (
        <li key={r.id} className="space-y-3 rounded-2xl bg-paper/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <Stars rating={r.rating} />
            <span className="text-xs text-mute">{day(r.createdAt)}</span>
          </div>
          <p className="font-medium">
            {r.name}
            {r.verified && <span className="ml-2 text-xs text-lemon">✓ Verified buyer</span>}
          </p>
          {r.text && <p className="whitespace-pre-line text-paper/75">{r.text}</p>}
          {r.photos.length > 0 && (
            <div className="flex gap-2">
              {r.photos.map((src) => (
                <a key={src} href={src} target="_blank" rel="noopener" className="block size-20 overflow-hidden rounded-lg bg-paper/10">
                  <img src={src} alt={`Photo from ${r.name}`} loading="lazy" className="size-full object-cover" />
                </a>
              ))}
            </div>
          )}
          {r.reply && (
            <div className="rounded-xl border-l-4 border-lemon bg-ink/40 p-3 text-sm">
              <p className="font-medium text-lemon">Stix N Vibes replied</p>
              <p className="mt-1 whitespace-pre-line text-paper/80">{r.reply}</p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
