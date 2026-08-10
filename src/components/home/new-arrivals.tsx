"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/layout/container";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product/product-card";
import { StaggerGroup, StaggerItem } from "@/components/motion/reveal";
import { getNewArrivals, type Product } from "@/lib/data/products";

export function NewArrivals({ products }: { products?: Product[] }) {
  const items = products || getNewArrivals();
  return (
    <section className="relative py-20 md:py-24 lg:py-28">
      <Container>
        <div className="flex flex-col items-end justify-between gap-6 md:flex-row md:items-end">
          <SectionHeader
            align="left"
            kicker={<>Freshly cut</>}
            title="New arrivals"
            description="Latest drops straight from the studio. We design in sprints so you can rotate your space."
          />
          <Button asChild variant="ghost" size="sm">
            <Link href="/shop?filter=new">
              See what's new <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <StaggerGroup className="mt-12 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-6">
          {items.map((p) => (
            <StaggerItem key={p.id} className={items.length <= 3 ? "col-span-2 md:col-span-1" : ""}>
              <ProductCard product={p} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Container>
    </section>
  );
}
