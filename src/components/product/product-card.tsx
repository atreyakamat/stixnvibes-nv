import Link from "next/link";
import { isSoldOut } from "@/lib/pricing";
import type { Product } from "@/lib/types";
import { CardPrice } from "./card-price";


export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const [first, ...rest] = product.images;
  const tag = product.status === "upcoming" ? "Coming soon" : isSoldOut(product) ? "Sold out" : product.badge;

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="ice group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-line p-4 transition-colors hover:border-lemon/60 md:p-5"
    >
      <div className="relative grid aspect-square place-items-center overflow-hidden rounded-2xl bg-ink/60 p-5">
        {first ? (
          <img
            src={first}
            alt={product.name}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : undefined}
            className="sticker-shadow max-h-full w-auto object-contain transition-transform duration-500 ease-out-expo group-hover:-rotate-3 group-hover:scale-105"
          />
        ) : (
          <span className="label text-mute">Photo soon</span>
        )}
        {rest.length > 0 && <span className="label absolute bottom-3 right-3 rounded-full bg-ink/80 px-2 py-1 text-mute">+{rest.length}</span>}
        {tag && (
          <span className={`label absolute left-3 top-3 rounded-full px-3 py-1.5 ${product.status === "live" && !isSoldOut(product) ? "bg-lemon text-ink" : "bg-paper text-ink"}`}>
            {tag}
          </span>
        )}
      </div>
      <div className="mt-4 flex flex-1 items-end justify-between gap-3">
        <h3 className="font-semibold leading-tight md:text-lg">{product.name}</h3>
        <CardPrice product={product} />
      </div>
    </Link>
  );
}
