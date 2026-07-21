import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Container } from "@/components/layout/container";
import { notFound } from "next/navigation";

const policies: Record<string, { title: string; body: string[] }> = {
  privacy: {
    title: "Privacy Policy",
    body: [
      "We only collect what we need to fulfil your order — name, contact, delivery address, and product choices.",
      "We never sell your data. We use it exclusively to ship your order and (if you opted in) email you release drops.",
      "Order data is stored in Supabase behind Row-Level Security; you can request deletion anytime via email.",
    ],
  },
  refund: {
    title: "Refund Policy",
    body: [
      "Pre-designed products: 7-day returns from delivery, no questions asked for unused items.",
      "Custom products (Spotify cards, custom posters, frames with your photo): refunds only for print defects.",
      "Refunds are issued to source payment within 5 business days. Mini mystery packs are non-refundable once opened.",
    ],
  },
  shipping: {
    title: "Shipping Policy",
    body: [
      "We ship across India in 2-3 business days. Free shipping above ₹499.",
      "Metro cities enjoy next-day delivery on most orders.",
      "International shipping available on request — contact hello@stixnvibes.com.",
    ],
  },
  terms: {
    title: "Terms & Conditions",
    body: [
      "By ordering you confirm contact & delivery details are accurate.",
      "All artwork is owned by Stix N Vibes unless you uploaded it; you retain rights to your uploaded photos.",
      "Orders may be cancelled before dispatch; once dispatched we cannot pause a courier.",
    ],
  },
  cookie: {
    title: "Cookie Policy",
    body: [
      "We use localStorage for cart contents and theme preference.",
      "Session cookies are issued by our Supabase auth when you sign in (admins only).",
      "We do not run third-party tracking pixels by default.",
    ],
  },
};

export default function PolicyPage({ params }: { params: { slug: string } }) {
  const policy = policies[params.slug];
  if (!policy) return notFound();
  return (
    <Container className="pt-28 pb-12 md:pt-36">
      <div className="max-w-2xl">
        <Link href="/policies" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" /> All policies</Link>
        <header className="mt-3 flex items-center gap-2">
          <ShieldCheck className="size-6 text-brand-yellow" />
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{policy.title}</h1>
        </header>
        <div className="mt-6 space-y-3 text-muted-foreground leading-relaxed">
          {policy.body.map((para, i) => (
            <p key={i} className="rounded-xl border border-border bg-card p-4 text-foreground/90">{para}</p>
          ))}
        </div>
        <p className="mt-8 text-xs text-muted-foreground">Last updated · 2026. For questions, email hello@stixnvibes.com.</p>
      </div>
    </Container>
  );
}
