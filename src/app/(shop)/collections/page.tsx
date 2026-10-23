import type { Metadata } from "next";
import { CollectionCard } from "@/components/collection-card";
import { collectionCover, getShopState } from "@/lib/shop";

export const revalidate = 60;
export const metadata: Metadata = { title: "Collections", description: "Sticker and poster collections from Stix N Vibes." };

export default async function CollectionsPage() {
  const { collections, products } = await getShopState();
  return (
    <section className="container-x pt-10 md:pt-16">
      <p className="label text-mute">Collections</p>
      <h1 className="display mt-4 text-[clamp(3.2rem,10vw,8rem)]">
        Pick a <span className="text-lemon">mood</span>
      </h1>
      {collections.length ? (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <li key={c.id}>
              <CollectionCard collection={c} cover={collectionCover(c, products)} count={products.filter((p) => p.collectionIds.includes(c.id)).length} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 text-paper/70">New collections are on the way.</p>
      )}
    </section>
  );
}
