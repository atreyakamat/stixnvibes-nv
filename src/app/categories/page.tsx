"use client";

import * as React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeader } from "@/components/layout/section-header";

const MOCK_CATEGORIES = [
  { id: "stickers", name: "Stickers", desc: "Die-cut, waterproof, and vibrant.", icon: "✨" },
  { id: "posters", name: "Posters", desc: "High-quality prints for your wall.", icon: "🖼️" },
  { id: "polaroids", name: "Polaroids", desc: "Retro-style mini prints.", icon: "📸" },
  { id: "cards", name: "Spotify Cards", desc: "Custom music cards.", icon: "🎵" },
  { id: "custom", name: "Custom Art", desc: "Your design, our print.", icon: "🎨" },
];

export default function CategoriesPage() {
  return (
    <main className="min-h-screen pt-24 pb-16">
      <Section>
        <Container>
          <SectionHeader
            title="Shop by Category"
            description="Find exactly what you're looking for."
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {MOCK_CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  href={`/categories/${cat.id}`}
                  className="group flex flex-col items-center justify-center gap-4 rounded-2xl bg-slate-900 p-8 shadow-premium transition-all hover:-translate-y-1 hover:shadow-glow border border-white/5"
                >
                  <span className="text-5xl">{cat.icon}</span>
                  <div className="text-center">
                    <h3 className="font-display text-2xl font-bold text-white group-hover:text-brand-yellow transition-colors">
                      {cat.name}
                    </h3>
                    <p className="mt-2 text-sm text-slate-300">
                      {cat.desc}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </Container>
      </Section>
    </main>
  );
}
