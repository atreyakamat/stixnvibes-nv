import type { Metadata } from "next";
import { getProductBySlug, products as mockProducts } from "@/lib/data/products";
import { ProductDetail } from "@/components/product/product-detail";
import { ShopView } from "@/components/shop/shop-view";
import { ProductJsonLd } from "@/components/seo/json-ld";

interface PageProps {
  params: { slug: string[] };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const pathSegments = params.slug ?? [];
  const targetSlug = pathSegments[pathSegments.length - 1];
  const product = getProductBySlug(targetSlug);

  if (product) {
    return {
      title: `${product.name} — Stix N Vibes`,
      description: product.description,
      alternates: { canonical: `/shop/${product.slug}` },
      openGraph: {
        title: `${product.name} — Stix N Vibes`,
        description: product.description,
        url: `/shop/${product.slug}`,
        images: [{ url: product.image, width: 800, height: 800, alt: product.name }],
        type: "website",
      },
    };
  }

  // Category page metadata
  const categoryTitle = pathSegments.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
  return {
    title: `${categoryTitle} Catalog — Stix N Vibes`,
    description: `Explore premium ${categoryTitle} merchandise, custom vinyl stickers, posters, frames & mystery packs.`,
    alternates: { canonical: `/shop/${pathSegments.join("/")}` },
  };
}

export default function ShopCatchAllPage({ params }: PageProps) {
  const pathSegments = params.slug ?? [];
  const lastSegment = pathSegments[pathSegments.length - 1];

  // 1. Check if the last segment is a product slug
  const product = getProductBySlug(lastSegment);

  if (product) {
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

  // 2. Otherwise render Shop Catalog View pre-filtered for category path
  return <ShopView />;
}
