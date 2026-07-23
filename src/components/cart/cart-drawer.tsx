"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, ShoppingBag, Trash2, ArrowRight, Sparkles, Truck, Gift, Copy, Check } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatPrice } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";

const EVENT_OPEN = "snv:cart:open";
const EVENT_CLOSED = "snv:cart:closed";

export function openCartDrawer() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT_OPEN));
}

const COUPONS: { code: string; type: "pct" | "flat"; value: number; label: string }[] = [
  { code: "VIBE10", type: "pct", value: 10, label: "10% off your order" },
  { code: "FREESHIP", type: "flat", value: 0, label: "Free shipping · auto applied at ₹499+" },
];

export function CartDrawer() {
  const { items, updateQuantity, removeItem, subtotalCents, count } = useCart();
  const [open, setOpen] = React.useState(false);
  const [coupon, setCoupon] = React.useState("");
  const [appliedCoupon, setAppliedCoupon] = React.useState<(typeof COUPONS)[number] | null>(null);
  const [couponErr, setCouponErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(EVENT_OPEN, onOpen);
    return () => window.removeEventListener(EVENT_OPEN, onOpen);
  }, []);

  React.useEffect(() => {
    if (!open) {
      // Allow body scroll
      if (typeof document !== "undefined") document.body.style.overflow = "";
      window.dispatchEvent(new Event(EVENT_CLOSED));
      return;
    }
    if (typeof document !== "undefined") document.body.style.overflow = "hidden";
  }, [open]);

  function applyCoupon(e: React.FormEvent) {
    e.preventDefault();
    const match = COUPONS.find((c) => c.code === coupon.trim().toUpperCase());
    if (!match) {
      setAppliedCoupon(null);
      setCouponErr("Coupon not recognised. Try VIBE10.");
      return;
    }
    setAppliedCoupon(match);
    setCouponErr(null);
  }

  const shippingThresholdCents = siteConfig.freeShippingThreshold * 100;
  const shippingCents =
    subtotalCents >= shippingThresholdCents ? 0 : subtotalCents > 0 ? 4900 : 0; // ₹49 flat
  const discountCents = appliedCoupon?.type === "pct"
    ? Math.round((subtotalCents * appliedCoupon.value) / 100)
    : 0;
  const totalCents = Math.max(0, subtotalCents - discountCents) + shippingCents;
  const progressPct = Math.min(100, (subtotalCents / shippingThresholdCents) * 100);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Shopping cart">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 32 }}
            className="absolute right-0 top-0 flex size-full max-w-md flex-col border-l border-border bg-card shadow-premium"
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <h2 className="font-display text-lg font-semibold">Cart</h2>
                <p className="text-xs text-muted-foreground">{count} item{count !== 1 ? "s" : ""}</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close cart" className="grid size-9 place-items-center rounded-full hover:bg-secondary">
                <X className="size-5" />
              </button>
            </div>

            {/* Free shipping progress */}
            {subtotalCents > 0 && (
              <div className="border-b border-border px-4 py-3">
                <p className="flex items-center gap-1.5 text-xs font-medium">
                  <Truck className="size-3.5 text-brand-yellow" />
                  {progressPct >= 100
                    ? <span className="text-green-700 dark:text-green-400">You unlocked free shipping! 🎉</span>
                    : <span>You're <strong className="font-semibold">{formatPrice(shippingThresholdCents / 100 - subtotalCents / 100)}</strong> away from free shipping</span>}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    className="h-full rounded-full bg-brand-gradient"
                  />
                </div>
              </div>
            )}

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4">
              {items.length === 0 ? (
                <div className="grid place-items-center h-full text-center">
                  <div>
                    <ShoppingBag className="size-10 text-muted-foreground/40" />
                    <p className="mt-3 font-medium">Your cart is empty</p>
                    <p className="text-sm text-muted-foreground mb-4">Time to vibe it up.</p>
                    <Button variant="gradient" size="sm" onClick={() => setOpen(false)} asChild>
                      <Link href="/shop"><ArrowRight className="size-4" /> Start shopping</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li key={item.id} className="flex gap-3 rounded-2xl border border-border bg-background/40 p-3">
                      {item.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt={item.name} className="size-16 shrink-0 rounded-xl object-cover" loading="lazy" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium leading-tight truncate">{item.name}</p>
                        {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                        <p className="mt-1 text-sm font-semibold tabular-nums">{formatPrice(item.price_cents / 100)}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-1 rounded-full border border-border bg-card">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Decrease" className="grid size-7 place-items-center rounded-full hover:bg-secondary">
                              <Minus className="size-3.5" />
                            </button>
                            <span className="w-6 text-center text-sm tabular-nums">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="Increase" className="grid size-7 place-items-center rounded-full hover:bg-secondary">
                              <Plus className="size-3.5" />
                            </button>
                          </div>
                          <button onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`} className="text-muted-foreground hover:text-accent">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Recommended */}
              {items.length > 0 && (
                <div className="mt-6 space-y-3">
                  <div className="rounded-2xl border border-dashed border-border p-4 text-center">
                    <Sparkles className="size-5 mx-auto text-brand-yellow" />
                    <p className="mt-2 text-sm">Add a <strong>Mystery Pack</strong> (₹299) and a free sticker is on us.</p>
                    <Button asChild variant="ghost" size="sm" className="mt-3">
                      <Link href="/shop/mystery" onClick={() => setOpen(false)}>Browse mystery packs →</Link>
                    </Button>
                  </div>
                  <ReferralCard />
                </div>
              )}
            </div>

            {/* Coupon + summary */}
            {items.length > 0 && (
              <div className="border-t border-border p-4 space-y-3">
                <form onSubmit={applyCoupon} className="flex gap-2">
                  <Input
                    placeholder="Coupon (try VIBE10)"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    className="flex-1"
                    aria-label="Coupon code"
                  />
                  <Button type="submit" variant="outline" size="default">Apply</Button>
                </form>
                {appliedCoupon && (
                  <p className="flex items-center gap-2 text-xs font-medium text-green-700 dark:text-green-400">
                    <Badge variant="success" size="sm">{appliedCoupon.code}</Badge> {appliedCoupon.label}
                  </p>
                )}
                {couponErr && <p className="text-xs text-accent">{couponErr}</p>}
                <dl className="text-sm space-y-1">
                  <Row label="Subtotal" value={formatPrice(subtotalCents / 100)} />
                  {discountCents > 0 && <Row label="Discount" value={`- ${formatPrice(discountCents / 100)}`} className="text-green-700 dark:text-green-400" />}
                  <Row label="Shipping" value={shippingCents === 0 ? "Free" : formatPrice(shippingCents / 100)} />
                </dl>
                <div className="flex items-center justify-between border-t border-border pt-2 font-display">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-semibold tabular-nums">{formatPrice(totalCents / 100)}</span>
                </div>
                <Button variant="gradient" size="xl" className="w-full shadow-glow" asChild onClick={() => setOpen(false)}>
                  <Link href="/checkout"><ArrowRight className="size-4" /> Checkout</Link>
                </Button>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function ReferralCard() {
  const [copied, setCopied] = React.useState(false);
  const [code, setCode] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("snv.referral.code");
      if (stored && /^SNV-[A-Z0-9]{4,12}$/.test(stored)) {
        setCode(stored);
        return;
      }
      const generated = `SNV-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Date.now().toString(36).slice(-3).toUpperCase()}`;
      window.localStorage.setItem("snv.referral.code", generated);
      setCode(generated);
    } catch {
      setCode("SNV-FRIENDS");
    }
  }, []);

  async function copyLink() {
    if (!code) return;
    const link = `${siteConfig.url}?ref=${code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="rounded-2xl border border-brand-yellow/30 bg-brand-yellow/5 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Gift className="size-4 text-brand-yellow" />
        Refer & earn ₹100
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Share your link — your friend gets 10% off their first order, you get ₹100 store credit when they buy.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg border border-border bg-background/60 px-3 py-1.5 font-mono text-xs">
          {code ?? "SNV-…"}
        </code>
        <Button size="sm" variant="outline" onClick={copyLink} aria-label="Copy referral link">
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
    </div>
  );
}
