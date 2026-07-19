"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Upload, Palette, Music2, ShoppingBag, Wand2 } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { StaggerGroup, StaggerItem, Reveal } from "@/components/motion/reveal";

const steps = [
  { Icon: Upload, title: "Upload your photo", caption: "Or pick a ready design to start." },
  { Icon: Music2, title: "Add your song link", caption: "Paste a Spotify URL & we scan its art." },
  { Icon: Palette, title: "Theme & colors", caption: "Pick finishes, gradients, fonts." },
  { Icon: ShoppingBag, title: "Order in 60s", caption: "We print & ship across India." },
];

export function CustomizeShowcase() {
  return (
    <section className="relative overflow-hidden py-24 md:py-32 lg:py-40 bg-zinc-950 text-white">
      {/* radial backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-brand-yellow/20 blur-[120px]" />
        <div className="absolute right-1/4 bottom-0 h-[500px] w-[500px] translate-x-1/2 rounded-full bg-brand-purple/20 blur-[120px]" />
      </div>

      <Container className="relative">
        <div className="grid items-center gap-16 lg:grid-cols-12">
          {/* Left — live mockup preview */}
          <Reveal variant="scale" className="lg:col-span-6">
            <div className="relative mx-auto max-w-md">
              <motion.div
                animate={{ rotate: [0, 2, -2, 0] }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                className="relative aspect-square rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 shadow-premium"
              >
                {/* mock spotify card */}
                <div className="relative size-full overflow-hidden rounded-2xl bg-white">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-orange via-brand-yellow to-brand-red opacity-90" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80"
                    alt="Custom preview"
                    className="absolute inset-0 size-full object-cover mix-blend-overlay"
                  />
                  <div className="absolute inset-0 p-6 flex flex-col justify-between text-zinc-950">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-xs font-bold uppercase tracking-[0.2em]">SNV Custom</span>
                      <span className="rounded-full bg-zinc-950/30 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">Live</span>
                    </div>
                    <div>
                      <p className="font-display text-2xl font-semibold">Khuddar</p>
                      <p className="text-sm">Karan Aujla</p>
                      {/* QR mock */}
                      <div className="mt-3 grid w-20 grid-cols-6 grid-rows-6 gap-0.5">
                        {Array.from({ length: 36 }).map((_, i) => (
                          <span
                            key={i}
                            className={`aspect-square rounded-[1px] ${(i * 7 + i * 3) % 3 === 0 ? "bg-zinc-950" : "bg-zinc-950/30"}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* floating spec tags */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="absolute -right-3 top-1/3 -translate-y-1/2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs backdrop-blur-md"
                >
                  300 GSM
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="absolute -left-3 top-2/3 -translate-y-1/2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs backdrop-blur-md"
                >
                  Matte Finish
                </motion.div>
              </motion.div>
            </div>
          </Reveal>

          {/* Right — copy + steps */}
          <div className="lg:col-span-6">
            <Reveal variant="fade">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/60 backdrop-blur">
                <Wand2 className="size-3.5 text-brand-yellow" /> Customizer
              </span>
            </Reveal>
            <Reveal>
              <h2 className="mt-5 font-display text-4xl font-semibold tracking-tight md:text-5xl text-balance">
                Make it <span className="brand-gradient-text">unmistakably</span> yours.
              </h2>
            </Reveal>
            <Reveal>
              <p className="mt-4 max-w-xl text-base text-white/70 md:text-lg text-balance">
                Spotify cards, posters, frames, and custom stickers — designed live in your browser. See exactly what you get before you tap order.
              </p>
            </Reveal>

            <StaggerGroup className="mt-10 grid gap-4 sm:grid-cols-2" stagger={0.1}>
              {steps.map((step, i) => (
                <StaggerItem key={step.title}>
                  <div className="relative rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition-transform duration-300 hover:-translate-y-1">
                    <div className="absolute right-5 top-5 font-display text-3xl font-semibold text-white/10">
                      0{i + 1}
                    </div>
                    <step.Icon className="size-6 text-brand-yellow" />
                    <h3 className="mt-3 font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm text-white/60">{step.caption}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerGroup>

            <div className="mt-10">
              <Button asChild variant="gradient" size="xl" className="shadow-glow group">
                <Link href="/customize">
                  Start Customizing
                  <ArrowRight className="transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
