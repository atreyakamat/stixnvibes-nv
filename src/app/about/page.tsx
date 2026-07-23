import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { SectionHeader } from "@/components/layout/section-header";
import { SustainabilityBadge } from "@/components/ui/sustainability-badge";

export const metadata: Metadata = {
  title: "About — Stix N Vibes",
  description: "Our story, mission, vision & values — premium stickers, posters, frames & more.",
  alternates: { canonical: "/about" },
};

const values = [
  { k: "Quality first", v: "Premium materials, archival inks, obsessive hand-checks — every order." },
  { k: "Customer obsessed", v: "We treat every order like our own — printing with love and care." },
  { k: "Always creating", v: "New drops every week, expanding collections, hand-curated quality." },
  { k: "Sustainable", v: "Recyclable kraft mailers · latex eco-solvent inks · made-in-India." },
];

export default function AboutPage() {
  return (
    <Container className="pt-28 pb-12 md:pt-36">
      <section className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Est. 2024 · Bengaluru
        </span>
        <div className="mt-5 flex justify-center">
          <SustainabilityBadge size="sm" />
        </div>
        <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight md:text-6xl text-balance">
          We're <span className="brand-gradient-text">Stix N Vibes</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground text-balance">
          A design-first brand making premium stickers, posters, Spotify cards & frames for people who want to bring their surfaces alive — wall, laptop, helmet, or fridge door.
        </p>
      </section>

      <SectionHeader
        align="left"
        className="mt-20"
        kicker="Mission"
        title={<>"Made for the people who want to <span className="brand-gradient-text">vibe loud</span>"</>}
        description="We obsess over material quality, customisation, and packaging — so every order unboxes like a gift, not a delivery."
      />

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {values.map((it) => (
          <div key={it.k} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="font-medium">{it.k}</p>
            <p className="mt-2 text-sm text-muted-foreground">{it.v}</p>
          </div>
        ))}
      </div>
    </Container>
  );
}
