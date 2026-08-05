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

export const revalidate = 60; // Revalidate feature flags & store configuration every 60s

export default async function HomePage() {
  const flags = await getStoreFeatureFlags();

  return (
    <>
      {flags.homepage_banner_enabled && <HeroSection />}
      {flags.categories_enabled && <FeaturedCategories />}
      <BestSellers />
      <NewArrivals />
      {flags.custom_orders_enabled && <CustomizeShowcase />}
      {flags.collections_enabled && <TrendingCollections />}
      <WhyChooseUs />
      {flags.reviews_enabled && <ReviewsSection />}
      <InstagramFeed />
      <Newsletter />
    </>
  );
}
