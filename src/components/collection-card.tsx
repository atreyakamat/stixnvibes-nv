import Link from "next/link";
import type { Collection } from "@/lib/types";

export function CollectionCard({ collection, cover, count }: { collection: Collection; cover: string | null; count: number }) {
  return (
    <Link
      href={`/collections/${collection.slug}`}
      className="ice group relative flex h-full flex-col justify-end overflow-hidden rounded-[1.75rem] border border-line p-6 transition-colors hover:border-lemon/60"
    >
      <div className="grid aspect-[4/3] place-items-center">
        {cover && (
          <img src={cover} alt="" loading="lazy" decoding="async" className="sticker-shadow max-h-full w-auto object-contain transition-transform duration-500 ease-out-expo group-hover:-rotate-3 group-hover:scale-105" />
        )}
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <h3 className="display text-4xl">{collection.name}</h3>
          {collection.description && <p className="mt-1 line-clamp-2 text-sm text-paper/70">{collection.description}</p>}
        </div>
        <span className="label shrink-0 text-mute">{count} designs</span>
      </div>
    </Link>
  );
}
