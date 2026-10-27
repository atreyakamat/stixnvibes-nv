import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { site } from "@/content/site";
import { getPostBySlug } from "@/lib/content";
import { plainText, readingMinutes } from "@/lib/markdown";

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const post = await getPostBySlug((await params).slug);
  if (!post) return { title: "Post not found" };
  const description = post.excerpt || plainText(post.body).slice(0, 160);
  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", title: post.title, description, ...(post.cover && !post.cover.startsWith("data:") ? { images: [{ url: post.cover }] } : {}) },
  };
}

const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const post = await getPostBySlug((await params).slug);
  if (!post) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Organization", name: site.name },
    ...(post.cover && !post.cover.startsWith("data:") ? { image: new URL(post.cover, site.url).toString() } : {}),
    mainEntityOfPage: `${site.url}/blog/${post.slug}`,
  };
  return (
    <article className="container-x max-w-3xl pt-10 md:pt-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Link href="/blog" className="label text-mute hover:text-lemon">
        ← Blog
      </Link>
      <h1 className="display mt-4 text-[clamp(2.6rem,7vw,4.8rem)]">{post.title}</h1>
      <p className="mt-3 text-sm text-mute">
        {post.publishedAt && day.format(new Date(post.publishedAt))} · {readingMinutes(post.body)} min read
      </p>
      {post.cover && <img src={post.cover} alt="" className="mt-8 w-full rounded-[1.5rem]" />}
      <Markdown source={post.body} className="mt-10" />
      <div className="mt-14 flex flex-wrap gap-3 border-t border-line pt-8">
        <Link href="/shop" className="btn btn-primary">
          Shop the stickers
        </Link>
        <Link href="/blog" className="btn btn-ghost">
          More posts
        </Link>
      </div>
    </article>
  );
}
