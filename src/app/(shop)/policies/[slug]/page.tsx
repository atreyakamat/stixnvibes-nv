import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { policies } from "@/content/policies";
import { getShopState } from "@/lib/shop";

export const revalidate = 300;
export const dynamicParams = false;

export function generateStaticParams() {
  return policies.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/policies/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const policy = policies.find((p) => p.slug === slug);
  return { title: policy?.title ?? "Policy" };
}

export default async function PolicyPage({ params }: PageProps<"/policies/[slug]">) {
  const { slug } = await params;
  const policy = policies.find((p) => p.slug === slug);
  if (!policy) notFound();
  const { settings } = await getShopState();

  return (
    <section className="container-x pt-10 md:pt-16">
      <nav aria-label="Policies" className="flex flex-wrap gap-2">
        {policies.map((p) => (
          <Link
            key={p.slug}
            href={`/policies/${p.slug}`}
            aria-current={p.slug === slug ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm ${p.slug === slug ? "bg-lemon text-ink" : "ring-1 ring-paper/25 hover:text-lemon"}`}
          >
            {p.title}
          </Link>
        ))}
      </nav>
      <h1 className="display mt-10 text-[clamp(3rem,9vw,6rem)]">{policy.title}</h1>
      <div className="mt-8 max-w-2xl space-y-5 text-lg text-paper/80">
        {policy.body(settings).map((para) => (
          <p key={para}>{para}</p>
        ))}
      </div>
    </section>
  );
}
