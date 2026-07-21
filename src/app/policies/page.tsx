import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";

export const metadata: Metadata = {
  title: "Policies — Stix N Vibes",
  description: "Privacy, refund, shipping, terms & cookie policies.",
  alternates: { canonical: "/policies" },
};

const policies = [
  { slug: "privacy", title: "Privacy Policy", description: "How we collect, use and protect your data." },
  { slug: "refund", title: "Refund Policy", description: "7-day easy returns on pre-designed items." },
  { slug: "shipping", title: "Shipping Policy", description: "India-wide shipping · 2-3 days · free over ₹499." },
  { slug: "terms", title: "Terms & Conditions", description: "Order terms, IP, usage agreements." },
  { slug: "cookie", title: "Cookie Policy", description: "Cookies and local storage usage." },
];

export default function PoliciesPage() {
  return (
    <Container className="pt-28 pb-12 md:pt-36">
      <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Policies</h1>
      <p className="mt-2 text-muted-foreground">Quick links to all our terms, in plain language.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {policies.map((p) => (
          <Link key={p.slug} href={`/policies/${p.slug}`} className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift">
            <h3 className="font-display font-semibold group-hover:text-primary">{p.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
            <span className="mt-3 inline-flex text-sm text-primary group-hover:underline">Read →</span>
          </Link>
        ))}
      </div>
    </Container>
  );
}
