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

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturedCategories />
      <BestSellers />
      <NewArrivals />
      <CustomizeShowcase />
      <TrendingCollections />
      <WhyChooseUs />
      <ReviewsSection />
      <InstagramFeed />
      <Newsletter />
    </>
  );
}
