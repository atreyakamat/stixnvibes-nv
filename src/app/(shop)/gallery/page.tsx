import type { Metadata } from "next";
import Link from "next/link";
import { PhotoWall } from "@/components/photo-wall";
import { formatStallDate, getColleges, getGallery, getPublicStalls } from "@/lib/content";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Library",
  description: "Our stalls, custom orders and the stickers, posters and cards we've made, from fests and pop-ups across Goa.",
  alternates: { canonical: "/gallery" },
};

export default async function GalleryPage({ searchParams }: PageProps<"/gallery">) {
  const sp = await searchParams;
  const [items, colleges, stalls] = await Promise.all([getGallery(), getColleges(), getPublicStalls()]);
  const college = colleges.find((c) => c.slug === sp.college);
  const shown = college ? items.filter((g) => g.collegeId === college.id || stalls.find((s) => s.id === g.stallId)?.collegeId === college.id) : items;
  const withWhere = shown.map((g) => {
    const st = stalls.find((s) => s.id === g.stallId);
    const c = colleges.find((x) => x.id === (g.collegeId ?? st?.collegeId));
    return { ...g, where: [st && `${st.name}, ${formatStallDate(st.date)}`, !st && c?.name].filter(Boolean).join("") };
  });
  const tabs = colleges.filter((c) => items.some((g) => g.collegeId === c.id || stalls.find((s) => s.id === g.stallId)?.collegeId === c.id));

  return (
    <section className="container-x pt-10 md:pt-16">
      <p className="label text-mute">Library</p>
      <h1 className="display mt-3 text-[clamp(3rem,9vw,6.5rem)]">
        What we&apos;ve <span className="text-lemon">made</span>
      </h1>
      <p className="mt-4 max-w-xl text-lg text-paper/75">Stalls, fests, custom orders and the walls and laptops our stickers ended up on.</p>
      {tabs.length > 0 && (
        <nav aria-label="Filter by college" className="mt-8 flex flex-wrap gap-2">
          <Link href="/gallery" className={`rounded-full px-4 py-2 text-sm ${!college ? "bg-lemon text-ink" : "bg-paper/5 hover:bg-paper/10"}`}>
            Everything
          </Link>
          {tabs.map((c) => (
            <Link key={c.id} href={`/gallery?college=${c.slug}`} className={`rounded-full px-4 py-2 text-sm ${college?.id === c.id ? "bg-lemon text-ink" : "bg-paper/5 hover:bg-paper/10"}`}>
              {c.name}
            </Link>
          ))}
        </nav>
      )}
      <div className="mt-8">
        {withWhere.length ? <PhotoWall items={withWhere} label={(g) => g.caption || g.where || "A photo from Stix N Vibes"} /> : <p className="text-paper/70">Photos are on their way.</p>}
      </div>
    </section>
  );
}
