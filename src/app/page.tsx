import { HeroSection } from "@/components/home/hero-section";
import { FeaturedCategories } from "@/components/home/featured-categories";
import { BestSellers } from "@/components/home/best-sellers";
import { NewArrivals } from "@/components/home/new-arrivals";
import { CustomizeShowcase } from "@/components/home/customize-showcase";
import { TrendingCollections } from "@/components/home/trending-collections";
import { WhyChooseUs } from "@/components/home/why-choose-us";
import { ReviewsSection } from "@/components/home/reviews-section";
import { InstagramFeed } from "@/components/home/instagram-feed";
import { Newsletter } from "@/components/home/newsletter";
import { getStoreFeatureFlags } from "@/lib/store-features";
import { ProductService } from "@/lib/services/product-service";
import { CategoryService } from "@/lib/services/category-service";
import { CollectionService } from "@/lib/services/collection-service";

export const revalidate = 60; // Revalidate feature flags & store configuration every 60s
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const flags = await getStoreFeatureFlags();
  const productService = new ProductService();
  const categoryService = new CategoryService();
  const collectionService = new CollectionService();

  const [dbProductsResult, categories, collections] = await Promise.all([
    productService.getProducts({}),
    categoryService.getCategories(),
    collectionService.getCollections(),
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
      rating: p.rating || 5.0,
      reviewCount: p.review_count || 0,
      customizable: p.customizable ?? false,
    }));

  const bestSellers = activeProducts.sort((a, b) => b.rating - a.rating).slice(0, 8);
  const newArrivals = activeProducts.filter(p => p.tags.includes("new")).slice(0, 8);
  const featuredCategories = categories.filter(c => c.isFeatured);
  const trendingCollections = collections.filter(c => c.isFeatured);

  return (
    <>
      {flags.homepage_banner_enabled && <HeroSection />}
      {flags.categories_enabled && <FeaturedCategories categories={featuredCategories.length > 0 ? featuredCategories : undefined} />}
      <BestSellers products={bestSellers.length > 0 ? bestSellers : undefined} />
      <NewArrivals products={newArrivals.length > 0 ? newArrivals : undefined} />
      {flags.custom_orders_enabled && <CustomizeShowcase />}
      {flags.collections_enabled && <TrendingCollections collections={trendingCollections.length > 0 ? trendingCollections : undefined} />}
      <WhyChooseUs />
      {flags.reviews_enabled && <ReviewsSection />}
      <InstagramFeed />
      <Newsletter />
    </>
  );
}
