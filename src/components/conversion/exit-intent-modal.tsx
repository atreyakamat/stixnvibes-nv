"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Mail, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORAGE_KEY = "snv.exitintent.seen";
const DELAY_MS = 30000; // 30s before exit-intent enables
const VIBE_CODE = "VIBE10";

export function ExitIntentModal() {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [done, setDone] = React.useState(false);
  const [armed, setArmed] = React.useState(false);

  // Arm only once after a delay
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORAGE_KEY) === "1") return;
    const t = window.setTimeout(() => setArmed(true), DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  // Exit-intent: mouse leaves to top of viewport
  React.useEffect(() => {
    if (!armed) return;
    function onLeave(e: MouseEvent) {
      if (e.clientY < 6 && !window.localStorage.getItem(STORAGE_KEY)) {
        setOpen(true);
        window.localStorage.setItem(STORAGE_KEY, "1");
      }
    }
    window.addEventListener("mouseout", onLeave);
    return () => window.removeEventListener("mouseout", onLeave);
  }, [armed]);

  // Mobile fallback: open after 20 seconds in-tab
  React.useEffect(() => {
    if (!armed) return;
    if (window.matchMedia("(pointer: coarse)").matches) {
      const t = window.setTimeout(() => {
        if (!window.localStorage.getItem(STORAGE_KEY)) {
          setOpen(true);
          window.localStorage.setItem(STORAGE_KEY, "1");
        }
      }, 20000);
      return () => window.clearTimeout(t);
    }
  }, [armed]);

  function copyCode() {
    navigator.clipboard?.writeText(VIBE_CODE).catch(() => {});
    setDone(true);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] grid place-items-center bg-zinc-950/80 backdrop-blur-md p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Subscriber discount"
        >
          <motion.div
            initial={{ scale: 0.94, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-card p-8 text-center shadow-premium"
          >
            <div className="pointer-events-none absolute inset-0 bg-brand-mesh opacity-50" />
            <div className="relative">
              <button onClick={() => setOpen(false)} aria-label="Close" className="absolute right-0 top-0 grid size-9 place-items-center rounded-full hover:bg-secondary">
                <X className="size-5" />
              </button>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
                <Sparkles className="size-3.5 text-brand-yellow" /> One-time only
              </span>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight">
                Wait — here's <span className="brand-gradient-text">10% off</span>
              </h2>
              <p className="mt-2 text-muted-foreground">Drop your email and we'll send a one-time code + early drops to your inbox.</p>

              <form
                onSubmit={(e) => { e.preventDefault(); copyCode(); }}
                className="mt-5 flex flex-col gap-2 sm:flex-row"
              >
                <Input
                  type="email"
                  placeholder="you@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                  aria-label="Email"
                />
                <Button type="submit" variant="gradient" className="shadow-glow">Get my code</Button>
              </form>

              {done ? (
                <div className="mt-4 rounded-xl border border-brand-yellow/40 bg-brand-yellow/10 p-3 text-sm">
                  <p className="flex items-center justify-center gap-2 font-semibold">
                    <Check className="size-4 text-green-600 dark:text-green-400" />
                    Your code is <code className="rounded bg-brand-yellow px-1.5 py-0.5 text-primary-foreground">{VIBE_CODE}</code>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Apply it at checkout. We'll email <span className="font-medium">{email}</span> the welcome series!</p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground inline-flex items-center justify-center gap-1"><Mail className="size-3.5" /> No spam · unsubscribe anytime.</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
