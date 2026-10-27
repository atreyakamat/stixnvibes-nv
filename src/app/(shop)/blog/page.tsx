import type { Metadata } from "next";
import Link from "next/link";
import { getPosts } from "@/lib/content";
import { readingMinutes } from "@/lib/markdown";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Blog",
  description: "Stall stories, sticker care, how we make things and what's new at Stix N Vibes.",
  alternates: { canonical: "/blog" },
};

const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

export default async function BlogPage() {
  const posts = await getPosts();
  return (
    <section className="container-x pt-10 md:pt-16">
      <p className="label text-mute">Blog</p>
      <h1 className="display mt-3 text-[clamp(3rem,9vw,6.5rem)]">
        Notes from the <span className="text-lemon">stall</span>
      </h1>
      {posts.length ? (
        <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <li key={p.id}>
              <Link href={`/blog/${p.slug}`} className="ice group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-line transition-colors hover:border-lemon/60">
                {p.cover && (
                  <span className="block aspect-[16/10] overflow-hidden bg-ink/60">
                    <img src={p.cover} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </span>
                )}
                <span className="flex flex-1 flex-col p-5">
                  <span className="text-xs text-mute">
                    {p.publishedAt && day.format(new Date(p.publishedAt))} · {readingMinutes(p.body)} min read
                  </span>
                  <span className="mt-2 text-xl font-semibold">{p.title}</span>
                  {p.excerpt && <span className="mt-2 text-sm text-paper/70">{p.excerpt}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 text-paper/70">The first post is on its way.</p>
      )}
    </section>
  );
}
