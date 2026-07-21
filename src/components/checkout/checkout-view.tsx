"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle2, Loader2, MessageCircle, ArrowLeft, ShoppingBag,
  Tag, MapPin, User, Phone, StickyNote, ShieldCheck, Sparkles,
} from "lucide-react";
import { useCart } from "@/context/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/layout/container";
import { cn, formatPrice } from "@/lib/utils";

type FormState = {
  name: string;
  phone: string;
  email: string;
  address: string;
  pincode: string;
  notes: string;
  wholesale: boolean;
};

const initial: FormState = {
  name: "",
  phone: "",
  email: "",
  address: "",
  pincode: "",
  notes: "",
  wholesale: false,
};

export function CheckoutView() {
  const router = useRouter();
  const { items, subtotalCents, clear } = useCart();
  const [form, setForm] = React.useState<FormState>(initial);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<{ whatsappUrl: string; orderId?: string | null } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Wholesale corporate discount (10%)
  const discountCents = form.wholesale ? Math.round(subtotalCents * 0.1) : 0;
  const shippingCents = subtotalCents >= 49900 ? 0 : items.length ? 4900 : 0;
  const totalCents = Math.max(0, subtotalCents - discountCents) + shippingCents;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: form.name,
          customer_phone: form.phone,
          customer_email: form.email || null,
          address: form.address,
          pincode: form.pincode,
          notes: form.notes,
          items: items.map((it) => ({
            product_id: it.productId,
            variant_id: it.variantId,
            name: it.name,
            quantity: it.quantity,
            price_cents: it.price_cents,
            image_url: it.image,
            variant_name: it.variantName,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Could not create order");
      }
      setResult({ whatsappUrl: json.whatsappUrl, orderId: json.orderId });
      // Don't clear cart until user confirms they sent the WhatsApp message.
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function onConfirm() {
    if (!result) return;
    window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
    clear();
    router.push("/account?order=sent");
  }

  // Empty cart & not just-successed
  if (items.length === 0 && !result) {
    return (
      <Container className="pt-28 pb-12 md:pt-36">
        <div className="grid min-h-[50vh] place-items-center text-center">
          <div>
            <ShoppingBag className="size-10 mx-auto text-muted-foreground/40" />
            <h1 className="mt-3 font-display text-2xl font-semibold">Your cart is empty</h1>
            <p className="mt-1 text-muted-foreground">Add some stickers before checking out.</p>
            <Button asChild variant="gradient" className="mt-4 shadow-glow">
              <Link href="/shop">Shop now</Link>
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  // Order-successful confirmation screen
  if (result) {
    return (
      <Container className="pt-28 pb-12 md:pt-36">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-xl text-center"
        >
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-gradient text-primary-foreground shadow-glow">
            <CheckCircle2 className="size-8" />
          </div>
          <h1 className="mt-5 font-display text-3xl font-semibold">Order ready to send</h1>
          <p className="mt-2 text-muted-foreground text-balance">
            Tap below to open WhatsApp with your pre-filled order summary. We'll confirm + dispatch on chat. No payment needed up-front — pay when your parcel arrives.
          </p>
          {result.orderId && (
            <p className="mt-3 text-xs text-muted-foreground">Order ref: <span className="font-mono">{result.orderId.split("-")[0]}</span></p>
          )}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="gradient" size="xl" className="shadow-glow" onClick={onConfirm}>
              <MessageCircle className="size-5" /> Send on WhatsApp
            </Button>
            <Button asChild variant="outline" size="xl"><Link href="/shop">Continue shopping</Link></Button>
          </div>
        </motion.div>
      </Container>
    );
  }

  return (
    <Container className="pt-28 pb-12 md:pt-36">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">Checkout</h1>
        <Link href="/shop" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Keep shopping
        </Link>
      </div>

      <form onSubmit={onSubmit} className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        {/* Shipping form */}
        <div className="space-y-6">
          <FormSection icon={<User className="size-4" />} title="Contact">
            <Field label="Full name" required>
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} autoComplete="name" required placeholder="Aarav Mehta" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone" required>
                <Input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} autoComplete="tel" required placeholder="+91 99999 99999" pattern="^\+?[0-9]{8,15}$" />
              </Field>
              <Field label="Email (optional)">
                <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" placeholder="you@email.com" />
              </Field>
            </div>
          </FormSection>

          <FormSection icon={<MapPin className="size-4" />} title="Shipping address">
            <Field label="Address" required>
              <Input value={form.address} onChange={(e) => update("address", e.target.value)} autoComplete="street-address" required placeholder="Flat, street, area, city" />
            </Field>
            <Field label="Pincode / ZIP" required>
              <Input value={form.pincode} onChange={(e) => update("pincode", e.target.value)} autoComplete="postal-code" required placeholder="560001" pattern="^[0-9A-Za-z\s\-]{3,10}$" />
            </Field>
          </FormSection>

          <FormSection icon={<StickyNote className="size-4" />} title="Notes & business options">
            <Field label="Notes (optional)">
              <Input value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Leave at security gate · gift wrap · etc." />
            </Field>
            <label className={cn("mt-2 flex cursor-pointer items-start gap-2 rounded-xl border border-border bg-secondary/40 p-3 transition-colors", form.wholesale && "bg-brand-yellow/10 border-brand-yellow/40")}>
              <input
                type="checkbox"
                checked={form.wholesale}
                onChange={(e) => update("wholesale", e.target.checked)}
                className="mt-0.5 accent-brand-yellow"
              />
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5"><Tag className="size-3.5 text-brand-yellow" /> Corporate / wholesale order</p>
                <p className="text-xs text-muted-foreground">Applies a 10% bulk discount. Our team will reach out with customisation options.</p>
              </div>
            </label>
          </FormSection>

          <div>
            {error && <p className="text-sm text-accent" role="alert">{error}</p>}
            <Button type="submit" variant="gradient" size="xl" className="w-full shadow-glow" disabled={submitting}>
              {submitting ? <><Loader2 className="size-4 animate-spin" /> Preparing order…</> : <><MessageCircle className="size-5" /> Place order on WhatsApp</>}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              <ShieldCheck className="inline size-3.5" /> We never store payment info · Pay later on delivery.
            </p>
          </div>
        </div>

        {/* Order summary */}
        <aside className="lg:sticky lg:top-24 self-start">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="font-display text-lg font-semibold">Order summary</h2>
            <ul className="mt-4 space-y-3">
              {items.map((it) => (
                <li key={it.id} className="flex gap-3">
                  {it.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image} alt={it.name} className="size-14 rounded-lg object-cover" loading="lazy" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{it.name}</p>
                    {it.variantName && <p className="text-xs text-muted-foreground">{it.variantName}</p>}
                    <p className="text-xs text-muted-foreground">Qty {it.quantity} · {formatPrice(it.price_cents / 100)}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{formatPrice((it.price_cents * it.quantity) / 100)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
              <Row label="Subtotal" value={formatPrice(subtotalCents / 100)} />
              {discountCents > 0 && <Row label="Bulk discount (10%)" className="text-green-700 dark:text-green-400" value={`- ${formatPrice(discountCents / 100)}`} />}
              <Row label="Shipping" value={shippingCents === 0 ? "Free" : formatPrice(shippingCents / 100)} />
            </dl>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 font-display">
              <span className="font-semibold">Total</span>
              <span className="text-2xl font-semibold tabular-nums">{formatPrice(totalCents / 100)}</span>
            </div>
            {form.wholesale && (
              <Badge variant="premium" size="sm" className="mt-3">
                <Sparkles className="size-3" /> Wholesale applied
              </Badge>
            )}
          </div>
        </aside>
      </form>
    </Container>
  );
}

function FormSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <header className="mb-3 flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-secondary text-brand-yellow">{icon}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-accent">*</span>}
      </span>
      {children}
    </label>
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
