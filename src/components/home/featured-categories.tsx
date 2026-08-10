"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Sticker, Image as ImageIcon, Music, Frame, Gift } from "lucide-react";
import { featuredCategories } from "@/lib/data/products";
import { Container } from "@/components/layout/container";
import { SectionHeader, Kicker } from "@/components/layout/section-header";
import { StaggerGroup, StaggerItem } from "@/components/motion/reveal";

const iconMap = { Sticker, Poster: ImageIcon, Music, Frame, Gift };

export function FeaturedCategories({ categories }: { categories?: any[] }) {
  const items = categories ? categories.map((c, i) => ({
    title: c.name,
    description: c.description || "",
    href: `/categories/${c.slug}`,
    image: c.imageUrl || "/images/placeholder.webp",
    gradient: ["from-brand-yellow/80", "from-purple-500/80", "from-brand-red/80", "from-orange-500/80", "from-blue-500/80"][i % 5],
    icon: "Sticker"
  })) : featuredCategories;

  return (
    <section className="relative py-20 md:py-24 lg:py-28">
      <Container>
        <SectionHeader
          kicker={<>Categories</>}
          title="Pick your canvas"
          description="Five loosely held worlds. One design language. Built for walls, laptops, helmets, fridge doors, and you."
        />
        <StaggerGroup className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((cat, i) => {
            const Icon = iconMap[cat.icon as keyof typeof iconMap];
            const isFeatured = i === 0 || i === 4;
            return (
              <StaggerItem key={cat.title} className={isFeatured ? "sm:col-span-2 lg:col-span-1" : ""}>
                <Link href={cat.href} className="group block h-full">
                  <motion.article
                    whileHover={{ y: -6 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="relative h-full overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition-all duration-300 hover:shadow-premium"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden sm:aspect-[16/10]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cat.image}
                        alt={cat.title}
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className={`absolute inset-0 bg-gradient-to-tr ${cat.gradient} opacity-80 mix-blend-soft-light`} />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/30 to-transparent" />

                      {/* Icon chip */}
                      <div className="absolute left-5 top-5 grid size-11 place-items-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-md text-white shadow-lift">
                        <Icon className="size-5" />
                      </div>

                      {/* CTA */}
                      <div className="absolute right-5 top-5 grid size-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md transition-all duration-300 group-hover:bg-white group-hover:text-zinc-950">
                        <ArrowUpRight className="size-5" />
                      </div>

                      {/* Title block */}
                      <div className="absolute inset-x-5 bottom-5">
                        <h3 className="font-display text-2xl font-semibold text-white md:text-3xl">
                          {cat.title}
                        </h3>
                        <p className="mt-1 text-sm text-white/80">{cat.description}</p>
                      </div>
                    </div>
                  </motion.article>
                </Link>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </Container>
    </section>
  );
}
