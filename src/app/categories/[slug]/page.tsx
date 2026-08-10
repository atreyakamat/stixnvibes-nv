import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopView } from "@/components/shop/shop-view";
import { ProductService } from "@/lib/services/product-service";
import { CategoryService } from "@/lib/services/category-service";
import { CollectionService } from "@/lib/services/collection-service";
import { MaterialService } from "@/lib/services/material-service";
import { Container } from "@/components/layout/container";

interface PageProps {
  params: { slug: string };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const categoryService = new CategoryService();
  const category = await categoryService.getCategoryBySlug(params.slug);
  
  if (!category) return { title: "Category not found" };

  return {
    title: `${category.name} — Stix N Vibes`,
    description: `Browse our ${category.name} category.`,
    alternates: { canonical: `/categories/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const productService = new ProductService();
  const categoryService = new CategoryService();
  const collectionService = new CollectionService();
  const materialService = new MaterialService();

  const category = await categoryService.getCategoryBySlug(params.slug);
  if (!category) return notFound();

  const [dbProducts, collections, materials] = await Promise.all([
    productService.getProducts({}),
    collectionService.getCollections(),
    materialService.getMaterials(),
  ]);

  const activeProducts = dbProducts.data
    .filter((p: any) => p.status === "active" && p.visibility !== "hidden" && p.category?.slug === params.slug)
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
      category: p.category?.name || "Stickers",
      collection: p.collection?.name || "General",
      tags: p.tags || [],
      rating: p.rating || 5.0,
      reviewCount: p.review_count || 0,
      customizable: p.customizable ?? false,
    }));

  return (
    <>
      <div className="bg-muted/30 pt-28 pb-12 md:pt-36 border-b border-border">
        <Container>
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">
              Category
            </p>
            <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl mb-4">
              {category.name}
            </h1>
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
