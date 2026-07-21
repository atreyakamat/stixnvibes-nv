"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/**
 * Floating WhatsApp / live-chat widget.
 * Pulses subtly, opens a small chat panel that launches WhatsApp when clicked.
 * Mounted globally in root layout.
 */
export function LiveChat() {
  const [open, setOpen] = React.useState(false);
  const [pulsed, setPulsed] = React.useState(false);

  React.useEffect(() => {
    const t = window.setTimeout(() => setPulsed(true), 4000);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="w-72 rounded-2xl border border-border bg-card p-4 shadow-premium"
            role="dialog"
            aria-label="Live chat"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-full bg-brand-gradient text-primary-foreground">
                  <MessageCircle className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Stix N Vibes</p>
                  <p className="text-xs text-green-600 dark:text-green-400">Online · replies in minutes</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close chat" className="grid size-8 place-items-center rounded-full hover:bg-secondary">
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Hi! 👋 Need help picking a pack or customising? Chat with our team on WhatsApp.
            </p>
            <a
              href={siteConfig.social.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white shadow-glow hover:brightness-110"
            >
              <Send className="size-4" /> Open WhatsApp
            </a>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open live chat"}
        className={cn(
          "relative grid size-12 place-items-center rounded-full bg-brand-gradient text-primary-foreground shadow-glow transition-transform hover:scale-105",
          !open && pulsed && "animate-pulse"
        )}
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-accent text-[10px] font-bold">
            !
          </span>
        )}
      </button>
    </div>
  );
}
