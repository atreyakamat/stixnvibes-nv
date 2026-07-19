"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/layout/container";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product/product-card";
import { StaggerGroup, StaggerItem } from "@/components/motion/reveal";
import { getBestSellers } from "@/lib/data/products";

export function BestSellers() {
  const items = getBestSellers();
  const scrollerRef = React.useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.85 * dir;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <section className="relative py-20 md:py-24 lg:py-28 bg-muted/30">
      <Container>
        <div className="flex flex-col items-end justify-between gap-6 md:flex-row md:items-end">
          <SectionHeader
            align="left"
            kicker={<>Loved by the community</>}
            title={<>Best<span className="brand-gradient-text">sellers</span> right now</>}
            description="The pieces people keep coming back for. Limited restocks, often flying off the shelf within 48 hours."
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => scrollBy(-1)} aria-label="Scroll left">
              ←
            </Button>
            <Button variant="outline" size="sm" onClick={() => scrollBy(1)} aria-label="Scroll right">
              →
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/shop?filter=popular">
                View all <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="no-scrollbar -mx-4 mt-12 flex snap-x snap-mandatory overflow-x-auto gap-4 px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        >
          {items.map((p) => (
            <div key={p.id} className="w-64 shrink-0 snap-start sm:w-72">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
