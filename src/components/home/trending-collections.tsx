"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { trendingCollections } from "@/lib/data/products";
import { Container } from "@/components/layout/container";
import { SectionHeader } from "@/components/layout/section-header";
import { StaggerGroup, StaggerItem } from "@/components/motion/reveal";

export function TrendingCollections() {
  return (
    <section className="relative py-20 md:py-24 lg:py-28">
      <Container>
        <SectionHeader
          kicker={<>Trending now</>}
          title={<>Collections your friends <span className="brand-gradient-text">won't shut up about</span></>}
          description="Curated drops from each universe — anime, F1, gaming, football, marvel & more. The algorithm approves."
        />
        <StaggerGroup className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3">
          {trendingCollections.map((c) => (
            <StaggerItem key={c.title}>
              <Link href={c.href} className="group block">
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={`relative aspect-[5/6] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${c.gradient} p-4 text-white shadow-soft transition-all duration-300 hover:shadow-premium`}
                >
                  <div className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-white/20 blur-2xl transition-opacity duration-300 group-hover:opacity-50" />
                  <div className="relative z-10 flex size-full flex-col">
                    <span className="text-4xl">{c.emoji}</span>
                    <div className="mt-auto">
                      <h3 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{c.title}</h3>
                      <p className="text-sm text-white/80">{c.count} pieces</p>
                      <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur transition-colors group-hover:bg-white group-hover:text-zinc-950">
                        Explore
                        <span className="transition-transform group-hover:translate-x-0.5">→</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Container>
    </section>
  );
}
