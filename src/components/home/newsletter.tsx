"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Mail, ArrowRight } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const perks = ["Early secret drops", "Subscriber-only pricing", "Free surprise sticker on first order"];

export function Newsletter() {
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<"idle" | "ok" | "err">("idle");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState("err");
      return;
    }
    setState("ok");
    setEmail("");
  };

  return (
    <section className="relative py-24 md:py-28 lg:py-32">
      <Container>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 sm:p-12 lg:p-16 shadow-lift">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-32 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-brand-yellow/25 blur-[100px]" />
            <div className="absolute -right-32 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-brand-purple/25 blur-[100px]" />
            <div className="absolute inset-0 bg-brand-mesh opacity-20" />
          </div>
          <div className="relative mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
              <Mail className="size-3.5 text-brand-yellow" /> Newsletter
            </span>
            <h2 className="mt-5 font-display text-4xl font-semibold tracking-tight md:text-5xl text-balance">
              Join the <span className="brand-gradient-text">StixNvibes</span> inner circle
            </h2>
            <p className="mt-3 text-base text-muted-foreground md:text-lg text-balance">
              Drops, behind-the-scenes, and the occasional 30%-off code you won't find in the shop.
            </p>

            <form onSubmit={onSubmit} className="mx-auto mt-8 flex flex-col items-center gap-2 sm:flex-row">
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setState("idle"); }}
                aria-label="Email address"
                className="h-12 w-full rounded-full border border-border bg-background/80 px-5 text-sm backdrop-blur outline-none ring-ring focus-visible:ring-2 sm:max-w-md"
              />
              <Button type="submit" variant="gradient" size="lg" className="w-full shadow-glow sm:w-auto group shrink-0">
                Subscribe
                <ArrowRight className="transition-transform group-hover:translate-x-1" />
              </Button>
            </form>

            <p
              className={cn(
                "mt-3 h-5 text-sm transition-colors",
                state === "ok" && "text-green-500",
                state === "err" && "text-accent",
                state === "idle" && "text-muted-foreground"
              )}
              role="status"
              aria-live="polite"
            >
              {state === "ok" && "You're in. Check your inbox for a welcome vibe ✨"}
              {state === "err" && "Please enter a valid email address."}
              {state === "idle" && "By subscribing you agree to our privacy policy."}
            </p>

            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              {perks.map((p) => (
                <li key={p} className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-brand-yellow" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
