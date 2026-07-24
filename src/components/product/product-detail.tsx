"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, Plus, Minus, Heart, ShoppingBag, Truck, ShieldCheck, RefreshCw,
  ChevronRight, Sparkles, Check, ZoomIn, MessageCircle, Leaf,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/layout/container";
import { ProductCard } from "@/components/product/product-card";
import { useCart } from "@/context/cart-context";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { cn, formatPrice } from "@/lib/utils";
import type { Product } from "@/lib/data/products";
import { siteConfig } from "@/lib/site-config";

const SIZES = ["A5", "A4", "A3", "Custom"];
const FINISHES = ["Matte", "Glossy", "Premium"];

export function ProductDetail({ product, related }: { product: Product; related: Product[] }) {
  const router = useRouter();
  const { addItem, items: cartItems } = useCart();
  const [selectedImage, setSelectedImage] = React.useState(0);
  const [size, setSize] = React.useState(SIZES[1]);
  const [finish, setFinish] = React.useState(FINISHES[0]);
  const [qty, setQty] = React.useState(1);
  const [zoom, setZoom] = React.useState(false);
  const [added, setAdded] = React.useState(false);

  const discount = product.compareAt
    ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100)
    : 0;
  const inStock = true; // mock
  const stockLimited = (product.stock ?? 0) > 0 && (product.stock ?? 0) <= 5;
  const isBundle = Boolean(product.isBundle);

  function handleAddToCart() {
    addItem(
      {
        productId: product.id,
        variantId: `${size}-${finish}`,
        variantName: `${size} · ${finish}`,
        name: product.name,
        slug: product.slug,
        image: product.image,
        price_cents: product.price * 100,
      },
      qty
    );
    setAdded(true);
    window.dispatchEvent(new Event("snv:cart:add"));
    window.setTimeout(() => setAdded(false), 1800);
  }

  function handleBuyNow() {
    addItem(
      {
        productId: product.id,
        variantId: `${size}-${finish}`,
        variantName: `${size} · ${finish}`,
        name: product.name,
        slug: product.slug,
        image: product.image,
        price_cents: product.price * 100,
      },
      qty
    );
    router.push("/checkout");
  }

  return (
    <Container className="pt-28 pb-12 md:pt-36">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="size-3" />
        <Link href="/shop" className="hover:text-foreground">Shop</Link>
        <ChevronRight className="size-3" />
        <Link href={`/shop?type=${product.type}`} className="hover:text-foreground">{product.category}</Link>
        <ChevronRight className="size-3" />
        <span className="truncate text-foreground/80">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-12 lg:gap-16">
        {/* Gallery */}
        <div className="lg:col-span-6">
          <div className="relative aspect-square overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
            <button
              type="button"
              onClick={() => setZoom(true)}
              aria-label="Open zoom view"
              className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full border border-border bg-background/70 backdrop-blur hover:bg-background"
            >
              <ZoomIn className="size-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img
              key={selectedImage}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              src={product.images[selectedImage] ?? product.image}
              alt={product.name}
              className="size-full object-cover"
            />
            {product.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full border border-border bg-background/70 p-1.5 backdrop-blur-md">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={cn(
                      "size-2.5 rounded-full transition-all",
                      i === selectedImage ? "bg-brand-yellow" : "bg-muted-foreground/40 hover:bg-muted-foreground"
                    )}
                    aria-label={`Image ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={cn(
                    "aspect-square overflow-hidden rounded-xl border-2 transition-all",
                    i === selectedImage ? "border-brand-yellow shadow-glow" : "border-border hover:border-muted-foreground"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="size-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info column (sticky purchase panel on lg) */}
        <div className="lg:col-span-6">
          <div className="lg:sticky lg:top-24">
            <div className="flex items-center gap-2">
              <Badge variant="outline" size="sm">{product.collection}</Badge>
              {product.tags.includes("bestseller") && <Badge variant="brand" size="sm">Best Seller</Badge>}
              {product.tags.includes("new") && <Badge variant="accent" size="sm">New</Badge>}
              {product.isLimited && (
                <Badge className="bg-zinc-950 text-brand-yellow border border-brand-yellow/40">
                  <Sparkles className="size-3" /> Limited Edition
                </Badge>
              )}
              {isBundle && (
                <Badge variant="premium" className="bg-brand-purple/15 text-brand-purple border border-brand-purple/25">
                  Bundle · Save more
                </Badge>
              )}
              {product.customizable && <Badge variant="default" size="sm" className="border-brand-purple/40 text-brand-purple">Customizable</Badge>}
              {discount > 0 && <Badge variant="premium" size="sm">-{discount}%</Badge>}
            </div>

            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl text-balance">
              {product.name}
            </h1>

            <div className="mt-3 flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={cn("size-4", i < Math.round(product.rating) ? "fill-brand-yellow text-brand-yellow" : "text-muted-foreground/30")} />
                ))}
              </div>
              <span className="font-medium">{product.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{product.reviewCount.toLocaleString()} reviews</span>
            </div>

            <div className="mt-5 flex items-baseline gap-3">
              <span className="font-display text-3xl font-semibold tracking-tight">{formatPrice(product.price)}</span>
              {product.compareAt && (
                <span className="text-lg text-muted-foreground line-through">{formatPrice(product.compareAt)}</span>
              )}
              {discount > 0 && (
                <Badge variant="accent" size="sm">Save {formatPrice(product.compareAt! - product.price)}</Badge>
              )}
            </div>

            <p className="mt-4 text-muted-foreground leading-relaxed">{product.description}</p>

            {/* Stock badge */}
            <div className="mt-4">
              {inStock ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-400">
                  <Check className="size-3.5" /> In stock · ships in 2-3 days
                  {stockLimited && <span className="ml-1 text-amber-600 dark:text-amber-400">· Only few left!</span>}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
                  Out of stock
                </span>
              )}
            </div>

            {/* Variants */}
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Size</p>
                <div className="flex flex-wrap gap-1.5">
                  {SIZES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={cn(
                        "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                        size === s ? "bg-primary text-primary-foreground border-transparent" : "border-border hover:bg-secondary"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Finish</p>
                <div className="flex flex-wrap gap-1.5">
                  {FINISHES.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFinish(f)}
                      className={cn(
                        "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                        finish === f ? "bg-accent text-accent-foreground border-transparent" : "border-border hover:bg-secondary"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quantity */}
            <div className="mt-6 flex items-center gap-4">
              <div className="flex items-center gap-2 rounded-full border border-border bg-card p-1">
                <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease quantity" className="grid size-9 place-items-center rounded-full hover:bg-secondary">
                  <Minus className="size-4" />
                </button>
                <input
                  type="number"
                  aria-label="Quantity"
                  className="w-10 bg-transparent text-center text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  min={1}
                  max={99}
                  value={qty}
                  onChange={(e) => setQty(Math.min(99, Math.max(1, Number(e.target.value) || 1)))}
                />
                <button onClick={() => setQty(Math.min(99, qty + 1))} aria-label="Increase quantity" className="grid size-9 place-items-center rounded-full hover:bg-secondary">
                  <Plus className="size-4" />
                </button>
              </div>
              <Button variant="outline" className="gap-2"><Heart className="size-4" /> Wishlist</Button>
            </div>

            {/* CTAs */}
            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button variant="gradient" size="xl" className="shadow-glow group sm:col-span-1" onClick={handleAddToCart} disabled={!inStock}>
                {added ? <Check className="size-4" /> : <ShoppingBag className="size-4" />}
                {added ? "Added!" : "Add to Cart"}
              </Button>
              <Button variant="outline" size="xl" className="sm:col-span-1" onClick={handleBuyNow} disabled={!inStock}>
                <Sparkles className="size-4 text-brand-yellow" /> Buy Now
              </Button>
            </div>

            {/* WhatsApp direct order */}
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-green-700 dark:text-green-500"
              onClick={() => {
                const url = buildWhatsAppUrl({
                  name: "(Customer)",
                  address: "(Customer address)",
                  pincode: "(Pincode)",
                  phone: "+91XXXXXXXXXX",
                  items: [
                    {
                      id: product.id,
                      productId: product.id,
                      name: product.name,
                      price_cents: product.price * 100,
                      quantity: qty,
                      image: product.image,
                      variantName: `${size} · ${finish}`,
                    },
                  ],
                  totalRupees: product.price * qty,
                });
                window.open(url, "_blank");
              }}
            >
              <MessageCircle className="size-4" /> Or order directly on WhatsApp
            </Button>

            {/* Trust badges */}
            <ul className="mt-6 grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <li className="flex items-center gap-2"><Truck className="size-4 text-brand-yellow" /> Free shipping over {formatPrice(siteConfig.freeShippingThreshold)}</li>
              <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-brand-yellow" /> Premium vinyl · waterproof</li>
              <li className="flex items-center gap-2"><RefreshCw className="size-4 text-brand-yellow" /> 7-day easy returns</li>
              <li className="flex items-center gap-2"><Sparkles className="size-4 text-brand-yellow" /> Made with love in India</li>
              <li className="flex items-center gap-2"><Leaf className="size-4 text-emerald-500" /> Latex eco-inks · recyclable mailer</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Product Technical Specifications */}
      <div className="mt-16 bg-slate-900/40 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl">
        <h2 className="font-display text-2xl font-bold text-white mb-6">Technical Specifications</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 uppercase tracking-wider block">Material Composition</span>
            <span className="font-medium text-white mt-1 block">100% Polyvinyl Chloride (PVC) Premium Vinyl</span>
          </div>
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 uppercase tracking-wider block">Weather & Water Resistance</span>
            <span className="font-medium text-white mt-1 block">IP68 Waterproof, Dishwasher Safe & UV Proof</span>
          </div>
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 uppercase tracking-wider block">Adhesive Technology</span>
            <span className="font-medium text-white mt-1 block">High-Tack Pressure Sensitive Acrylic (Residue-Free)</span>
          </div>
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 uppercase tracking-wider block">Print Resolution</span>
            <span className="font-medium text-white mt-1 block">1200 DPI Ultra-HD Japanese Eco-Solvent Ink</span>
          </div>
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 uppercase tracking-wider block">Thickness Gauge</span>
            <span className="font-medium text-white mt-1 block">6.0 mil (150 microns) Heavy Duty Vinyl Layer</span>
          </div>
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 uppercase tracking-wider block">Origin & Craftsmanship</span>
            <span className="font-medium text-white mt-1 block">Hand-Finished Studio Craft in Bengaluru, India</span>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <div className="mt-16 bg-slate-900/40 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">Customer Reviews</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center text-brand-yellow">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <span className="text-sm font-semibold text-white">{product.rating.toFixed(1)} out of 5</span>
              <span className="text-xs text-slate-400">({product.reviewCount} verified reviews)</span>
            </div>
          </div>
          <Button variant="outline" onClick={() => alert("Review submission form submitted successfully!")}>
            Write a Review
          </Button>
        </div>

        {/* Sample Customer Review Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-yellow/20 text-brand-yellow flex items-center justify-center font-bold text-sm">
                  R
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm">Rohan Mehta</h4>
                  <span className="text-[10px] text-emerald-400 font-mono">Verified Buyer</span>
                </div>
              </div>
              <div className="flex text-brand-yellow">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current" />
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              "The holographic finish on this sticker pack is mind-blowing! Absolutely zero bubbles when applying to my MacBook Pro."
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-red/20 text-brand-red flex items-center justify-center font-bold text-sm">
                  P
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm">Priya Sharma</h4>
                  <span className="text-[10px] text-emerald-400 font-mono">Verified Buyer</span>
                </div>
              </div>
              <div className="flex text-brand-yellow">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current" />
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              "Delivery was super fast (2 days to Mumbai). Print detail and vinyl quality are top notch!"
            </p>
          </div>
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">You'll probably love these too</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Zoom modal */}
      <AnimatePresence>
        {zoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/90 backdrop-blur p-6"
            onClick={() => setZoom(false)}
          >
            <button onClick={() => setZoom(false)} className="absolute right-6 top-6 grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20">
              <span className="sr-only">Close</span><Plus className="size-5 rotate-45 text-white" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              src={product.images[selectedImage] ?? product.image}
              alt={product.name}
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-premium"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Container>
  );
}
