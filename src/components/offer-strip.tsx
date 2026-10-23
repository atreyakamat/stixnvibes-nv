import type { Offer } from "@/lib/types";

export function OfferStrip({ offers, className = "" }: { offers: Offer[]; className?: string }) {
  if (!offers.length) return null;
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`} aria-label="Offers">
      {offers.map((o) => (
        <li key={o.id} className="rounded-full bg-lemon px-4 py-2 text-sm font-medium text-ink">
          {o.name}
        </li>
      ))}
    </ul>
  );
}
