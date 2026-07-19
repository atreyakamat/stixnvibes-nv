"use client";

import { BadgeCheck, ShieldCheck, Truck, Palette, Heart, Sparkles } from "lucide-react";
import { Container } from "@/components/layout/container";
import { SectionHeader } from "@/components/layout/section-header";
import { StaggerGroup, StaggerItem } from "@/components/motion/reveal";

const reasons = [
  { Icon: BadgeCheck, title: "Premium Quality", caption: "300 GSM paper, archival inks, latex vinyl. No compromises.", color: "text-brand-yellow" },
  { Icon: Truck, title: "Fast Shipping", caption: "Bengaluru to anywhere in India — 3-5 days, tracked end to end.", color: "text-brand-orange" },
  { Icon: Sparkles, title: "Waterproof Options", caption: "Vinyl that survives rain, sweat, helmet, and two monsoons.", color: "text-brand-red" },
  { Icon: ShieldCheck, title: "Secure Payments", caption: "Razorpay + UPI. Cards, wallets, autocomplete, all locked tight.", color: "text-brand-purple" },
  { Icon: Palette, title: "Easy Customization", caption: "Live preview, instant edits, ship in 60 seconds flat.", color: "text-brand-yellow" },
  { Icon: Heart, title: "Made with Love", caption: "Every sticker hand-checked before it leaves the studio.", color: "text-brand-red" },
];

export function WhyChooseUs() {
  return (
    <section className="relative py-20 md:py-24 lg:py-28 bg-muted/30">
      <Container>
        <SectionHeader
          kicker={<>Why SNV</>}
          title={<>Built for the people who <span className="brand-gradient-text">stick different</span></>}
          description="Tiny team, very loud taste. Every product gets the same obsessive treatment."
        />
        <StaggerGroup className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((r) => (
            <StaggerItem key={r.title}>
              <div className="group relative h-full rounded-2xl border border-border bg-card p-7 shadow-soft transition-all duration-300 hover:shadow-premium hover:-translate-y-1">
                <div className="flex items-start gap-4">
                  <div className="grid size-12 place-items-center rounded-xl border border-border bg-secondary/70 transition-colors group-hover:border-transparent">
                    <r.Icon className={`size-6 ${r.color}`} />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold tracking-tight">{r.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{r.caption}</p>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Container>
    </section>
  );
}
