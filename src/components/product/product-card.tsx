import Link from "next/link";
import { formatINR } from "@/lib/money";
import { fromPrice, isPurchasable } from "@/lib/orders/pricing";
import type { Product } from "@/lib/types";

export function priceLabel(product: Product): string {
  const price = fromPrice(product);
  if (price === null) return "Ask on Instagram";
  const multiple = new Set(product.variants.filter((v) => v.active && v.pricePaise !== null).map((v) => v.pricePaise)).size > 1;
  return `${multiple ? "From " : ""}${formatINR(price)}`;
}

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const soldOut = product.variants.length > 0 && product.variants.filter((v) => v.active).every((v) => v.stock === 0);
  const buyable = isPurchasable(product);
  const [first, ...rest] = product.images;

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="ice group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-line p-5 transition-colors hover:border-lemon/60"
    >
      <div className="relative grid aspect-square place-items-center overflow-hidden rounded-2xl bg-ink/60 p-6">
        {first ? (
          <img
            src={first}
            alt={product.name}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            className="sticker-shadow max-h-full w-auto object-contain transition-transform duration-500 ease-out-expo group-hover:-rotate-3 group-hover:scale-105"
          />
        ) : (
          <span className="label text-mute">Photo soon</span>
        )}
        {rest.length > 0 && (
          <span className="label absolute bottom-3 right-3 rounded-full bg-ink/80 px-2 py-1 text-mute">+{rest.length}</span>
        )}
        {soldOut && (
          <span className="label absolute left-3 top-3 rounded-full bg-paper px-3 py-1.5 text-ink">Sold out</span>
        )}
      </div>
      <div className="mt-5 flex flex-1 items-end justify-between gap-3">
        <h3 className="text-lg font-semibold leading-tight">{product.name}</h3>
        <p className={`shrink-0 text-right text-sm tabular-nums ${buyable ? "text-lemon" : "text-mute"}`}>
          {priceLabel(product)}
        </p>
      </div>
    </Link>
  );
}
