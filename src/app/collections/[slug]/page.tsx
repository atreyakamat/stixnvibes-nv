import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopView } from "@/components/shop/shop-view";
import { ProductService } from "@/lib/services/product-service";
import { CollectionService } from "@/lib/services/collection-service";
import { MaterialService } from "@/lib/services/material-service";
import { Container } from "@/components/layout/container";

interface PageProps {
  params: { slug: string };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const collectionService = new CollectionService();
  const collection = await collectionService.getCollectionBySlug(params.slug);
  
  if (!collection) return { title: "Collection not found" };

  return {
    title: `${collection.name} Collection — Stix N Vibes`,
    description: collection.description || `Browse our ${collection.name} collection.`,
    alternates: { canonical: `/collections/${collection.slug}` },
  };
}

export default async function CollectionPage({ params }: PageProps) {
  const productService = new ProductService();
  const collectionService = new CollectionService();
  const materialService = new MaterialService();

  const collection = await collectionService.getCollectionBySlug(params.slug);
  if (!collection) return notFound();

  const [dbProductsResult, collections, materials] = await Promise.all([
    productService.getProducts({}),
    collectionService.getCollections(),
    materialService.getMaterials(),
  ]);

  const activeProducts = dbProductsResult.data
    .filter((p: any) => p.status === "active" && p.visibility !== "hidden" && p.collection?.slug === params.slug)
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

  return (
    <>
      <div className="bg-muted/30 pt-28 pb-12 md:pt-36 border-b border-border">
        <Container>
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">
              Collection
            </p>
            <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl mb-4">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="text-muted-foreground text-lg">{collection.description}</p>
            )}
          </div>
        </Container>
      </div>
      <div className="-mt-28">
        <ShopView
          initialProducts={activeProducts}
          collections={collections}
          materials={materials}
        />
      </div>
    </>
  );
}
