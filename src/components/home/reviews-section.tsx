"use client";

import { Star } from "lucide-react";
import { Container } from "@/components/layout/container";
import { SectionHeader } from "@/components/layout/section-header";

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
            <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/60 p-4 text-sm text-muted-foreground">
              Reviews will appear here once real customer orders and feedback are available.
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
              The first customer stories will be published here after the launch period begins.
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
