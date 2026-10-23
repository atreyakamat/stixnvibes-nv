import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OfferStrip } from "@/components/offer-strip";
import { ProductCard } from "@/components/product/product-card";
import { getShopState } from "@/lib/shop";

export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { collections } = await getShopState();
  const c = collections.find((x) => x.slug === slug);
  return c ? { title: `${c.name} collection`, description: c.description || undefined } : { title: "Not found" };
}

export default async function CollectionPage({ params }: PageProps<"/collections/[slug]">) {
  const { slug } = await params;
  const { collections, products, offers } = await getShopState();
  const c = collections.find((x) => x.slug === slug);
  if (!c) notFound();
  const items = products
    .filter((p) => p.collectionIds.includes(c.id))
    .sort((a, b) => Number(a.status === "upcoming") - Number(b.status === "upcoming"));
  const types = new Set(items.map((p) => p.type));

  return (
    <section className="container-x pt-10 md:pt-16">
      <nav aria-label="Breadcrumb" className="label text-mute">
        <Link href="/collections" className="hover:text-lemon">
          Collections
        </Link>
      </nav>
      <h1 className="display mt-4 text-[clamp(3.2rem,10vw,8rem)]">{c.name}</h1>
      {c.description && <p className="mt-4 max-w-xl text-lg text-paper/75">{c.description}</p>}
      <OfferStrip offers={offers.filter((o) => o.productType === null || types.has(o.productType))} className="mt-6" />
      {items.length ? (
        <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
          {items.map((p, i) => (
            <li key={p.id}>
              <ProductCard product={p} priority={i < 4} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 text-paper/70">Designs for this collection are dropping soon.</p>
      )}
    </section>
  );
}
