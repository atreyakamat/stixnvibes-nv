import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { StaticImageData } from "next/image";
import { ProductDetail } from "@/components/product/product-detail";
import { getProductBySlug, products as mockProducts } from "@/lib/data/products";
import { ProductJsonLd } from "@/components/seo/json-ld";

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = getProductBySlug(params.slug);
  if (!product) return { title: "Not found" };
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/shop/${product.slug}` },
    openGraph: {
      title: `${product.name} — Stix N Vibes`,
      description: product.description,
      url: `/shop/${product.slug}`,
      images: [{ url: product.image, width: 800, height: 800, alt: product.name }],
      type: "website",
    },
    twitter: { card: "summary_large_image", images: [product.image] },
  };
}

export default function ProductPage({ params }: PageProps) {
  const product = getProductBySlug(params.slug);
  if (!product) return notFound();
  const related = mockProducts
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, 4);

  return (
    <>
      <ProductJsonLd
        name={product.name}
        slug={product.slug}
        image={product.image}
        description={product.description}
        priceRupees={product.price}
        compareAtRupees={product.compareAt}
        rating={product.rating}
        reviewCount={product.reviewCount}
      />
      <ProductDetail product={product} related={related} />
    </>
  );
}
