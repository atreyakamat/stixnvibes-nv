import "server-only";
import { cache } from "react";
import { istToday } from "@/lib/costs";
import { getStoreOrNull } from "@/lib/store";
import type { BlogPost, College, GalleryItem, Stall, StallSale } from "@/lib/types";

// Blog posts, library photos, colleges and stalls for storefront pages.
// Like the catalog, these return empty lists instead of throwing, so a page
// still renders before the v7 migration has run or while the database is down.

async function safe<T>(what: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  const store = getStoreOrNull();
  if (!store) return fallback;
  try {
    return await fn();
  } catch (err) {
    console.error(`[content] failed to load ${what}`, err);
    return fallback;
  }
}

export const getPosts = cache((): Promise<BlogPost[]> => safe("posts", () => getStoreOrNull()!.listPosts(), []));

export const getPostBySlug = cache(async (slug: string) => (await getPosts()).find((p) => p.slug === slug) ?? null);

export const getGallery = cache((): Promise<GalleryItem[]> => safe("gallery", () => getStoreOrNull()!.listGallery(), []));

export const getColleges = cache((): Promise<College[]> => safe("colleges", () => getStoreOrNull()!.listColleges(), []));

export const getCollegeBySlug = cache(async (slug: string) => (await getColleges()).find((c) => c.slug === slug) ?? null);

/** Stalls marked public, as name, date, venue and college only (no money). */
export const getPublicStalls = cache(
  (): Promise<Pick<Stall, "id" | "name" | "date" | "venue" | "collegeId">[]> =>
    safe(
      "stalls",
      async () =>
        (await getStoreOrNull()!.listStalls())
          .filter((s) => s.public)
          .map(({ id, name, date, venue, collegeId }) => ({ id, name, date, venue, collegeId })),
      [],
    ),
);

export async function upcomingStalls(collegeId?: string) {
  const today = istToday();
  return (await getPublicStalls())
    .filter((s) => s.date >= today && (!collegeId || s.collegeId === collegeId))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Sales at a college's stalls, for its "best sellers here" list. */
export const getCollegeSales = cache(
  (collegeId: string): Promise<StallSale[]> =>
    safe(
      "college sales",
      async () => {
        const store = getStoreOrNull()!;
        const ids = new Set((await store.listStalls()).filter((s) => s.collegeId === collegeId).map((s) => s.id));
        if (!ids.size) return [];
        return (await store.listStallSales({ limit: 5000 })).filter((x) => x.stallId && ids.has(x.stallId));
      },
      [],
    ),
);

const stallDay = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
export const formatStallDate = (d: string) => stallDay.format(new Date(d));
