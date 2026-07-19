"use client";

import { Star, Quote } from "lucide-react";
import { Container } from "@/components/layout/container";
import { SectionHeader } from "@/components/layout/section-header";
import { StaggerGroup, StaggerItem } from "@/components/motion/reveal";
import { reviews } from "@/lib/data/products";

export function ReviewsSection() {
  return (
    <section className="relative py-20 md:py-24 lg:py-28">
      <Container>
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <SectionHeader
              align="left"
              kicker={<>Wall of love</>}
              title={<>Vibes that <span className="brand-gradient-text">land loud</span></>}
              description="Real reviews from real customers who tagged @stixnvibes on Instagram. We re-share the best ones weekly."
            />
            <div className="mt-6 flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="size-5 fill-brand-yellow text-brand-yellow" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-display text-2xl font-semibold text-foreground">4.9</span>
                <span className="mx-2">·</span>
                <span>12,000+ reviews</span>
              </p>
            </div>
          </div>

          <div className="lg:col-span-8">
            <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2" stagger={0.08}>
              {reviews.map((r) => (
                <StaggerItem key={r.name}>
                  <figure className="relative h-full rounded-2xl border border-border bg-card p-6 shadow-soft transition-all duration-300 hover:shadow-lift hover:-translate-y-1">
                    <Quote className="absolute right-4 top-4 size-7 text-muted-foreground/20" />
                    <div className="flex items-center gap-1">
                      {[...Array(r.rating)].map((_, i) => (
                        <Star key={i} className="size-3.5 fill-brand-yellow text-brand-yellow" />
                      ))}
                    </div>
                    <blockquote className="mt-3 text-sm leading-relaxed text-foreground">
                      {r.text}
                    </blockquote>
                    <figcaption className="mt-4 flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.avatar} alt={r.name} className="size-9 rounded-full object-cover" />
                      <div>
                        <p className="text-sm font-semibold">{r.name} · <span className="font-normal text-muted-foreground">{r.location}</span></p>
                        <p className="text-xs text-muted-foreground">on {r.product}</p>
                      </div>
                    </figcaption>
                  </figure>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </div>
      </Container>
    </section>
  );
}
