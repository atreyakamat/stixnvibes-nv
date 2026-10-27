import type { MetadataRoute } from "next";
import { policies } from "@/content/policies";
import { site } from "@/content/site";
import { getColleges, getPosts } from "@/lib/content";
import { getShopState } from "@/lib/shop";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ products, collections }, posts, colleges] = await Promise.all([getShopState(), getPosts(), getColleges()]);
  return [
    { url: `${site.url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${site.url}/collections`, changeFrequency: "weekly", priority: 0.7 },
    ...collections.map((c) => ({ url: `${site.url}/collections/${c.slug}`, priority: 0.7 })),
    ...products.map((p) => ({ url: `${site.url}/shop/${p.slug}`, lastModified: p.updatedAt, priority: 0.6 })),
    { url: `${site.url}/bundle`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${site.url}/gallery`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${site.url}/blog`, changeFrequency: "weekly", priority: 0.5 },
    ...posts.map((p) => ({ url: `${site.url}/blog/${p.slug}`, lastModified: p.updatedAt, priority: 0.5 })),
    { url: `${site.url}/c`, changeFrequency: "monthly", priority: 0.4 },
    ...colleges.map((c) => ({ url: `${site.url}/c/${c.slug}`, priority: 0.5 })),
    ...policies.map((p) => ({ url: `${site.url}/policies/${p.slug}`, priority: 0.2 })),
  ];
}
