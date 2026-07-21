import type { Metadata } from "next";
import Link from "next/link";
import { Instagram, MessageCircle, Mail, Clock, MapPin } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact — Stix N Vibes",
  description: "Reach the Stix N Vibes team via WhatsApp, Instagram, email or phone.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <Container className="pt-28 pb-12 md:pt-36">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Say hi 👋</h1>
        <p className="mt-2 text-muted-foreground text-lg">Whether it's an order question, a partnership idea or feedback — we're quick to reply.</p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ContactCard
            href={siteConfig.social.whatsapp}
            label="WhatsApp"
            value={siteConfig.contact.phone}
            icon={<MessageCircle className="size-5 text-green-600 dark:text-green-400" />}
          />
          <ContactCard
            href={siteConfig.social.instagram}
            label="Instagram"
            value="@stixnvibes"
            icon={<Instagram className="size-5 text-pink-500" />}
          />
          <ContactCard
            href={`mailto:${siteConfig.social.email}`}
            label="Email"
            value={siteConfig.social.email}
            icon={<Mail className="size-5 text-brand-yellow" />}
          />
          <ContactCard label="Business hours" value={siteConfig.contact.hours} icon={<Clock className="size-5 text-brand-purple" />} />
        </div>

        <section className="mt-10 grid gap-8 rounded-3xl border border-border bg-card p-6 md:grid-cols-2 md:p-10">
          <div>
            <h2 className="font-display text-2xl font-semibold">Drop a note</h2>
            <p className="mt-1 text-sm text-muted-foreground">Fill the form, we usually reply within a few hours during business days.</p>
            <form className="mt-6 space-y-3">
              <input type="text" placeholder="Your name" required className="block w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              <input type="email" placeholder="Email" required className="block w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              <textarea placeholder="How can we help?" required rows={5} className="block w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              <Button type="submit" variant="gradient" size="lg" className="shadow-glow">Send message</Button>
            </form>
          </div>
          <div className="grid place-items-center rounded-2xl bg-zinc-950 p-6 text-center text-white">
            <div>
              <MapPin className="size-8 mx-auto text-brand-yellow" />
              <p className="mt-3 font-display text-xl font-semibold">Stix N Vibes HQ</p>
              <p className="text-sm text-white/60">{siteConfig.contact.address}</p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">Mon–Sat · 10 AM – 7 PM IST</p>
            </div>
          </div>
        </section>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Have a product question? Visit <Link href="/faq" className="underline-offset-2 hover:underline">our FAQ</Link> first.
        </p>
      </div>
    </Container>
  );
}

function ContactCard({ href, label, value, icon }: { href?: string; label: string; value: string; icon: React.ReactNode }) {
  const inner = (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift">
      <span className="grid size-11 place-items-center rounded-xl border border-border bg-background/40">{icon}</span>
      <h3 className="mt-3 font-semibold">{label}</h3>
      <p className="mt-0.5 text-sm text-muted-foreground">{value}</p>
    </div>
  );
  return href ? (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer noopener" className="block">{inner}</a>
  ) : inner;
}
