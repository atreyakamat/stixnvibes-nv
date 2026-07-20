import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  const now = new Date();

  const staticRoutes = [
    "/", "/shop", "/shop/stickers", "/shop/stickers/normal",
    "/shop/stickers/vinyl", "/shop/posters", "/shop/posters/a5",
    "/shop/posters/a4", "/shop/posters/a3",
    "/shop/spotify-cards", "/shop/spotify-cards/ready",
    "/shop/frames", "/shop/frames/standard", "/shop/frames/premium",
    "/shop/mystery", "/shop/mystery/anime", "/shop/mystery/gaming",
    "/shop/mystery/premium",
    "/customize", "/customize/spotify-card", "/customize/posters",
    "/customize/frames", "/customize/stickers",
    "/cart", "/checkout", "/account",
    "/about", "/faq", "/contact",
    "/policies/privacy", "/policies/refund", "/policies/shipping", "/policies/terms", "/policies/cookie",
  ];

  return staticRoutes.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : path.startsWith("/shop") ? 0.9 : 0.6,
  }));
}
