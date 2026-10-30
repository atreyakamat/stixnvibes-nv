import { appCatalog } from "@/lib/app-api";
import { getColleges, getGallery, getPosts, getPublishedReviews, upcomingStalls } from "@/lib/content";
import { getShopState } from "@/lib/shop";

// The whole storefront in one read for the Android app: products, offers,
// colleges, stalls, blog and library. Public data only (see lib/app-api.ts).
// The app keeps the last copy for stalls with no signal.

export const revalidate = 60;

export async function GET() {
  const [{ products, collections, offers, settings }, colleges, stalls, posts, gallery, reviews] = await Promise.all([
    getShopState(),
    getColleges(),
    upcomingStalls(),
    getPosts(),
    getGallery(),
    getPublishedReviews(),
  ]);
  return Response.json(appCatalog({ products, collections, offers, settings, colleges, stalls, posts, gallery, reviews }), {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=600" },
  });
}
