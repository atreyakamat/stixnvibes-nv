"use client";

import * as React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeader } from "@/components/layout/section-header";

const MOCK_COLLECTIONS = [
  { id: "anime", name: "Anime", desc: "Your favorite characters in vibrant quality.", color: "from-blue-500 to-cyan-400" },
  { id: "marvel", name: "Marvel", desc: "Earth's mightiest heroes and villains.", color: "from-red-500 to-orange-500" },
  { id: "f1", name: "Formula 1", desc: "High-speed thrills and racing icons.", color: "from-slate-700 to-slate-900" },
  { id: "music", name: "Music", desc: "Albums, artists, and lyrics that define you.", color: "from-purple-500 to-pink-500" },
  { id: "aesthetic", name: "Aesthetic", desc: "Vibes that match your daily mood.", color: "from-emerald-400 to-teal-500" },
  { id: "gaming", name: "Gaming", desc: "Level up your setup with gaming art.", color: "from-brand-yellow to-orange-400" },
];

export default function CollectionsPage() {
  return (
    <main className="min-h-screen pt-24 pb-16">
      <Section>
        <Container>
          <SectionHeader
            title="All Collections"
            description="Explore our curated sets of stickers, posters, and cards."
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {MOCK_COLLECTIONS.map((col, i) => (
              <motion.div
                key={col.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  href={`/collections/${col.id}`}
                  className="group relative flex h-64 flex-col justify-end overflow-hidden rounded-2xl bg-slate-900 p-6 shadow-premium transition-transform hover:-translate-y-1"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${col.color} opacity-20 transition-opacity group-hover:opacity-40`} />
                  <div className="relative z-10">
                    <h3 className="font-display text-2xl font-bold text-white group-hover:text-brand-yellow transition-colors">
                      {col.name}
                    </h3>
                    <p className="mt-2 text-sm text-slate-300">
                      {col.desc}
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
