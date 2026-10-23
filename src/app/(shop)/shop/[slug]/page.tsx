import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyBox } from "@/components/product/buy-box";
import { Gallery } from "@/components/product/gallery";
import { ProductCard } from "@/components/product/product-card";
import { site } from "@/content/site";
import { fromPrice } from "@/lib/pricing";
import { getProductBySlug, getShopState } from "@/lib/shop";
import { PRODUCT_TYPES } from "@/lib/types";

export const revalidate = 60;

export async function generateStaticParams() {
  // Pages render on first visit and are then cached, so a build without a
  // database still works.
  return [];
}

export async function generateMetadata({ params }: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return { title: "Not found" };
  return {
    title: product.name,
    description: product.description || site.description,
    openGraph: { images: product.images[0] && !product.images[0].startsWith("data:") ? [{ url: product.images[0] }] : undefined },
  };
}

export default async function ProductPage({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const [product, { products, collections, settings }] = await Promise.all([getProductBySlug(slug), getShopState()]);
  if (!product) notFound();

  const type = PRODUCT_TYPES.find((t) => t.id === product.type);
  const inCollections = collections.filter((c) => product.collectionIds.includes(c.id));
  const related = products
    .filter((p) => p.id !== product.id && p.status !== "hidden" && (p.collectionIds.some((c) => product.collectionIds.includes(c)) || p.type === product.type))
    .slice(0, 8);
  const url = `${site.url}/shop/${product.slug}`;
  const price = fromPrice(product);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.filter((i) => !i.startsWith("data:")).map((i) => (i.startsWith("http") ? i : `${site.url}${i}`)),
    brand: { "@type": "Brand", name: site.name },
    ...(price !== null &&
      product.status === "live" && {
        offers: {
          "@type": "Offer",
          priceCurrency: "INR",
          price: (price / 100).toFixed(2),
          availability: product.soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
          url,
        },
      }),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="container-x pt-8 md:pt-12">
        <nav aria-label="Breadcrumb" className="label text-mute">
          <Link href="/shop" className="hover:text-lemon">
            Shop
          </Link>
          {type && (
            <>
              {" / "}
              <Link href={`/shop?type=${type.id}`} className="hover:text-lemon">
                {type.label}
              </Link>
            </>
          )}
        </nav>

        <div className="mt-6 grid gap-10 md:grid-cols-2 md:gap-16">
          <Gallery images={product.images} name={product.name} />

          <div className="md:pt-6">
            {product.badge && <p className="label text-lemon">{product.badge}</p>}
            <h1 className="display mt-2 text-[clamp(2.8rem,7vw,5.5rem)]">{product.name}</h1>
            {product.description && <p className="mt-5 max-w-lg whitespace-pre-line text-lg text-paper/75">{product.description}</p>}

            <div className="mt-8">
              <BuyBox product={product} url={url} />
            </div>

            {product.details && (
              <div className="mt-10 border-t border-line pt-6">
                <h2 className="label text-mute">Details</h2>
                <p className="mt-3 whitespace-pre-line text-paper/75">{product.details}</p>
              </div>
            )}
            <div className="mt-6 border-t border-line pt-6">
              <h2 className="label text-mute">Ordering</h2>
              <p className="mt-3 text-paper/75">
                {settings.deliveryNote}{" "}
                <Link href="/policies/ordering" className="underline underline-offset-4 hover:text-lemon">
                  How ordering works
                </Link>
              </p>
            </div>
            {inCollections.length > 0 && (
              <p className="mt-6 text-sm text-mute">
                Part of{" "}
                {inCollections.map((c, i) => (
                  <span key={c.id}>
                    {i > 0 && ", "}
                    <Link href={`/collections/${c.slug}`} className="text-paper underline underline-offset-4 hover:text-lemon">
                      {c.name}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section className="pt-24" aria-labelledby="related">
            <h2 id="related" className="display text-5xl">
              More like this
            </h2>
            <ul className="mt-8 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
              {related.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
