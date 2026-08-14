import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product/product-detail";
import { getProductBySlug, products as mockProducts, type Product as ClientProduct } from "@/lib/data/products";
import { ProductJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { ProductService } from "@/lib/services/product-service";
import { MaterialService } from "@/lib/services/material-service";
import { SizeService } from "@/lib/services/size-service";

interface PageProps {
  params: { slug: string };
}

export const dynamic = "force-dynamic";

async function getProductData(slug: string): Promise<{ product: ClientProduct; related: ClientProduct[], materials: any[], sizes: any[] } | null> {
  const productService = new ProductService();
  const materialService = new MaterialService();
  const sizeService = new SizeService();

  const [dbProductsResult, materials, sizes] = await Promise.all([
    productService.getProducts({}),
    materialService.getMaterials(),
    sizeService.getSizes(),
  ]);

  const activeProducts = dbProductsResult.data
    .filter((p: any) => p.status === "active" && p.visibility !== "hidden")
    .map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description || p.short_description || "",
      price: (p.price_cents || 0) / 100,
      compareAt: p.compare_at_cents ? p.compare_at_cents / 100 : undefined,
      currency: p.currency || "INR",
      image: p.image_url || (Array.isArray(p.images) && p.images[0]) || "/images/placeholder.webp",
      images: Array.isArray(p.images) && p.images.length > 0 ? p.images : [p.image_url || "/images/placeholder.webp"],
      type: p.type === "sticker" ? "sticker_normal" : p.type,
      category: p.collection?.name || "Stickers",
      collection: p.collection?.name || "General",
      tags: p.tags || [],
      rating: p.rating ? Number(p.rating) : 5.0,
      reviewCount: p.review_count ? Number(p.review_count) : 0,
      customizable: p.customizable ?? false,
    }));

  let product = activeProducts.find(p => p.slug === slug);
  let related: ClientProduct[] = [];

  if (product) {
    related = activeProducts
      .filter(p => p.id !== product!.id && p.category === product!.category)
      .slice(0, 4) as ClientProduct[];
  } else {
    product = getProductBySlug(slug) as any;
    if (product) {
      related = mockProducts
        .filter((p) => p.id !== product!.id && p.category === product!.category)
        .slice(0, 4) as ClientProduct[];
    }
  }

  if (!product) return null;

  return { product: product as ClientProduct, related, materials, sizes };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getProductData(params.slug);
  if (!data) return { title: "Not found" };
  const { product } = data;
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

export default async function ProductPage({ params }: PageProps) {
  const data = await getProductData(params.slug);
  if (!data) return notFound();
  
  const { product, related, materials, sizes } = data;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Shop", url: "/shop" },
          { name: product.category, url: `/shop?category=${encodeURIComponent(product.category)}` },
          { name: product.name, url: `/shop/${product.slug}` },
        ]}
      />
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
      <ProductDetail product={product} related={related} materials={materials} sizes={sizes} />
    </>
  );
}
