"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { siteConfig } from "@/lib/site-config";

// Floating sticker shapes around the hero
const floaters = [
  { label: "Anime", emoji: "🌸", className: "top-[12%] left-[6%] size-16 rotate-[-12deg] md:size-20", delay: 0 },
  { label: "F1", emoji: "🏎️", className: "top-[20%] right-[8%] size-20 rotate-[8deg] md:size-28", delay: 0.2 },
  { label: "Music", emoji: "🎧", className: "bottom-[18%] left-[10%] size-14 rotate-[6deg] md:size-20", delay: 0.4 },
  { label: "Marvel", emoji: "🦸", className: "bottom-[24%] right-[6%] size-16 rotate-[-8deg] md:size-24", delay: 0.6 },
  { label: "Gaming", emoji: "🎮", className: "top-[44%] left-[2%] size-12 rotate-[14deg] md:size-16", delay: 0.8 },
  { label: "Football", emoji: "⚽", className: "top-[58%] right-[4%] size-12 rotate-[-4deg] md:size-16", delay: 1.0 },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Ambient background mesh */}
      <div className="pointer-events-none absolute inset-0 bg-brand-mesh opacity-70" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-brand-yellow/30 via-brand-orange/20 to-brand-red/10 blur-[100px]" />
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_120%,hsl(var(--brand-purple)/0.12),transparent_60%)]" />

      <Container className="relative">
        <div className="grid items-center gap-12 pb-14 pt-32 md:pt-44 lg:grid-cols-12 lg:gap-8 lg:pb-20 lg:pt-52">
          {/* Left — copy */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
            }}
            className="lg:col-span-7 text-center lg:text-left"
          >
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
              }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur"
            >
              <Sparkles className="size-3.5 text-brand-yellow" />
              New drop: Anime Heroes Pack — vinyl, waterproof, holo rare.
            </motion.div>

            <motion.h1
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
              }}
              className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl lg:text-[5.5rem] text-balance"
            >
              <span className="brand-gradient-text">{siteConfig.tagline}</span>
              <br />
              <span className="text-foreground">Make every surface </span>
              <span className="relative inline-block">
                yours.
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.9, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute -bottom-1 left-0 right-0 origin-left h-1.5 rounded-full bg-brand-gradient"
                />
              </span>
            </motion.h1>

            <motion.p
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
              }}
              className="mx-auto mt-6 max-w-xl text-base text-muted-foreground md:text-lg lg:mx-0 text-balance"
            >
              {siteConfig.subTagline}
            </motion.p>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
              }}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start"
            >
              <Button asChild variant="gradient" size="xl" className="w-full sm:w-auto shadow-glow group">
                <Link href="/shop">
                  Shop Now
                  <ArrowRight className="transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="w-full sm:w-auto backdrop-blur">
                <Link href="/customize">
                  <Sparkles className="text-brand-yellow" /> Customize Yours
                </Link>
              </Button>
            </motion.div>

            {/* Trust row */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.2 } },
              }}
              className="mt-8 flex items-center justify-center gap-6 lg:justify-start"
            >
              <div className="flex -space-x-2">
                {[
                  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80",
                  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80",
                  "https://images.unsplash.com/photo-1500648766835-cf79d2c98e60?auto=format&fit=crop&w=80&q=80",
                  "https://images.unsplash.com/photo-1488426862026-3ee34a7d77df?auto=format&fit=crop&w=80&q=80",
                ].map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt="" className="size-8 rounded-full border-2 border-background object-cover" />
                ))}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-3.5 fill-brand-yellow text-brand-yellow" />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Loved by 50k+ creators</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Right — sticker collage */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="relative lg:col-span-5"
          >
            <div className="relative mx-auto aspect-square w-full max-w-md lg:max-w-none">
              {/* Main sticker circle */}
              <motion.div
                initial={{ scale: 0.8, rotate: -8 }}
                animate={{ scale: 1, rotate: -8 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 grid place-items-center"
              >
                <div className="relative size-72 rounded-full bg-brand-gradient p-1 shadow-glow md:size-80 lg:size-96 animate-float">
                  <div className="grid size-full place-items-center rounded-full bg-zinc-950 p-8 text-center">
                    <div className="relative">
                      <p className="font-display text-6xl font-semibold text-white md:text-7xl">SNV</p>
                      <p className="mt-2 text-sm font-medium tracking-[0.3em] text-white/70 uppercase">Since Day One</p>
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white backdrop-blur">
                        <Sparkles className="size-3" /> Premium Vinyl
                      </div>
                    </div>
                  </div>
                  {/* Decorative ring */}
                  <div className="absolute -inset-3 -z-10 rounded-full border border-dashed border-brand-yellow/30 animate-spin-slow" />
                </div>
              </motion.div>

              {/* Floating stickers */}
              {floaters.map((f) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: f.delay + 0.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className={`absolute ${f.className}`}
                >
                  <motion.div
                    animate={{ y: [0, -8, 0], rotate: [0, 5, 0] }}
                    transition={{ duration: 4 + f.delay, repeat: Infinity, ease: "easeInOut" }}
                    className="grid size-full place-items-center rounded-2xl border border-white/10 bg-white/5 p-2 text-3xl shadow-premium backdrop-blur-md md:text-4xl"
                  >
                    {f.emoji}
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Marquee strip */}
        <div className="relative -mx-4 overflow-hidden border-y border-border bg-background/40 py-3 backdrop-blur sm:-mx-6 lg:-mx-8">
          <div className="flex animate-marquee gap-12 whitespace-nowrap text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {[...Array(2)].map((_, repeat) => (
              <div key={repeat} className="flex gap-12 shrink-0">
                {["Premium Vinyl", "UV Resistant", "Waterproof", "Custom Designs", "India-wide Shipping", "Spotify Cards", "Mystery Drops", "Made With Love"].map((item) => (
                  <span key={item} className="flex items-center gap-3 shrink-0">
                    <Sparkles className="size-3.5 text-brand-yellow" />
                    {item}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
