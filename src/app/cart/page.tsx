"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeader } from "@/components/layout/section-header";
import { useCart } from "@/context/cart-context";
import { Button } from "@/components/ui/button";

export default function CartPage() {
  const { items, subtotalCents, updateQuantity, removeItem } = useCart();

  return (
    <main className="min-h-screen pt-24 pb-16">
      <Section>
        <Container size="narrow">
          <SectionHeader
            title="Your Cart"
            description="Review your items before checkout."
          />
          
          <div className="mt-12">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-white/10 bg-slate-900/50 p-12 text-center shadow-premium backdrop-blur-sm">
                <div className="grid size-20 place-items-center rounded-full bg-slate-800 text-slate-400">
                  <ShoppingBag className="size-10" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-white">Your cart is empty</h3>
                  <p className="mt-2 text-slate-400">Looks like you haven't added anything yet.</p>
                </div>
                <Button variant="gradient" asChild>
                  <Link href="/shop">Start Shopping</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="space-y-4">
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center gap-4 rounded-2xl border border-white/5 bg-slate-900 p-4 shadow-sm sm:gap-6 sm:p-6"
                    >
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-800">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center bg-slate-800 text-slate-500">
                            <ShoppingBag className="size-8" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col justify-between">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-semibold text-white">{item.name}</h4>
                            {item.variantName && (
                              <p className="mt-1 text-sm text-slate-400">{item.variantName}</p>
                            )}
                          </div>
                          <p className="font-semibold text-brand-yellow">
                            ₹{(item.price_cents / 100).toFixed(2)}
                          </p>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-slate-950/50 px-3 py-1">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="text-slate-400 hover:text-white"
                            >
                              <Minus className="size-4" />
                            </button>
                            <span className="w-4 text-center text-sm font-medium text-white">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="text-slate-400 hover:text-white"
                            >
                              <Plus className="size-4" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="size-5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-premium backdrop-blur-md">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <span className="text-slate-300">Subtotal</span>
                    <span className="text-lg font-semibold text-white">₹{(subtotalCents / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <span className="text-slate-300">Shipping</span>
                    <span className="text-sm text-slate-400">Calculated at checkout</span>
                  </div>
                  <div className="flex items-center justify-between pt-4">
                    <span className="text-lg font-bold text-white">Total</span>
                    <span className="text-2xl font-bold text-brand-yellow">₹{(subtotalCents / 100).toFixed(2)}</span>
                  </div>
                  <Button variant="gradient" size="lg" className="mt-6 w-full text-lg" asChild>
                    <Link href="/checkout">Proceed to Checkout</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Container>
      </Section>
    </main>
  );
}
