import type { Metadata } from "next";
import { ShopView } from "@/components/shop/shop-view";
import { ProductService } from "@/lib/services/product-service";
import { CollectionService } from "@/lib/services/collection-service";
import { MaterialService } from "@/lib/services/material-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop — Stix N Vibes",
  description: "Browse premium stickers, posters, Spotify cards, frames and mystery packs. Filter by price, material, theme, and colour.",
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Shop — Stix N Vibes",
    description: "The full Stix N Vibes catalog — premium stickers, posters, frames & more.",
    url: "/shop",
  },
};

export default async function ShopPage() {
  const productService = new ProductService();
  const collectionService = new CollectionService();
  const materialService = new MaterialService();

  const [dbProductsResult, collections, materials] = await Promise.all([
    productService.getProducts({}),
    collectionService.getCollections(),
    materialService.getMaterials(),
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

  return (
    <ShopView
      initialProducts={activeProducts}
      collections={collections}
      materials={materials}
    />
  );
}

