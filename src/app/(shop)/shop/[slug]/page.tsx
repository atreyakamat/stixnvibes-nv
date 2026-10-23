import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/product/add-to-cart";
import { Gallery } from "@/components/product/gallery";
import { ProductCard } from "@/components/product/product-card";
import { site } from "@/content/site";
import { fromPrice } from "@/lib/orders/pricing";
import { getProductBySlug, getShopState } from "@/lib/shop";
import { CATEGORIES } from "@/lib/types";

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
    openGraph: { images: product.images[0] ? [{ url: product.images[0] }] : undefined },
  };
}

export default async function ProductPage({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const [product, { products, settings }] = await Promise.all([getProductBySlug(slug), getShopState()]);
  if (!product) notFound();

  const category = CATEGORIES.find((c) => c.id === product.category);
  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);
  const price = fromPrice(product);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((i) => (i.startsWith("http") ? i : `${site.url}${i}`)),
    brand: { "@type": "Brand", name: site.name },
    ...(price !== null && {
      offers: {
        "@type": "Offer",
        priceCurrency: "INR",
        price: (price / 100).toFixed(2),
        availability: product.variants.some((v) => v.active && v.stock !== 0)
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        url: `${site.url}/shop/${product.slug}`,
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
          {category && (
            <>
              {" / "}
              <Link href={`/shop?category=${category.id}`} className="hover:text-lemon">
                {category.label}
              </Link>
            </>
          )}
        </nav>

        <div className="mt-6 grid gap-10 md:grid-cols-2 md:gap-16">
          <Gallery images={product.images} name={product.name} />

          <div className="md:pt-6">
            <h1 className="display text-[clamp(2.8rem,7vw,5.5rem)]">{product.name}</h1>
            {product.description && <p className="mt-5 max-w-lg text-lg text-paper/75">{product.description}</p>}

            <div className="mt-8">
              <AddToCart product={product} storeOpen={Boolean(settings?.storeOpen)} />
            </div>

            {product.details && (
              <div className="mt-10 border-t border-line pt-6">
                <h2 className="label text-mute">Details</h2>
                <p className="mt-3 whitespace-pre-line text-paper/75">{product.details}</p>
              </div>
            )}
            <div className="mt-6 border-t border-line pt-6">
              <h2 className="label text-mute">Shipping</h2>
              <p className="mt-3 text-paper/75">
                {settings?.dispatchNote || "We dispatch within 2 days."}{" "}
                <Link href="/policies/shipping" className="underline underline-offset-4 hover:text-lemon">
                  Shipping info
                </Link>
              </p>
            </div>
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
