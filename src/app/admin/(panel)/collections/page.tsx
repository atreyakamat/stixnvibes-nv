import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/session";
import { collectionCover } from "@/lib/shop";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Collections" };

export default async function CollectionsAdmin() {
  await requireAdmin();
  const store = getStore();
  const [collections, products] = await Promise.all([store.listCollections({ includeHidden: true }), store.listProducts({ includeHidden: true })]);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="display text-5xl">Collections</h1>
        <Link href="/admin/collections/new" className="btn btn-primary">
          New collection
        </Link>
      </div>
      {collections.length === 0 ? (
        <p className="rounded-2xl border border-line p-6 text-paper/70">No collections yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => {
            const cover = collectionCover(c, products);
            const n = products.filter((p) => p.collectionIds.includes(c.id)).length;
            return (
              <li key={c.id}>
                <Link href={`/admin/collections/${c.id}`} className="flex items-center gap-4 rounded-2xl border border-line p-4 hover:border-lemon/60">
                  <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-ink p-1">{cover && <img src={cover} alt="" className="max-h-full w-auto object-contain" />}</span>
                  <span>
                    <span className="block font-medium">{c.name}</span>
                    <span className="text-sm text-mute">
                      {n} products{!c.active && " · hidden"}
                      {c.featured && " · featured"}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
