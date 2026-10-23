import type { MetadataRoute } from "next";
import { policies } from "@/content/policies";
import { site } from "@/content/site";
import { getShopState } from "@/lib/shop";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products } = await getShopState();
  return [
    { url: `${site.url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${site.url}/custom`, changeFrequency: "monthly", priority: 0.6 },
    ...products.map((p) => ({ url: `${site.url}/shop/${p.slug}`, lastModified: p.updatedAt, priority: 0.7 })),
    ...policies.map((p) => ({ url: `${site.url}/policies/${p.slug}`, priority: 0.2 })),
  ];
}
