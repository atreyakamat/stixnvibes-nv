"use client";

import * as React from "react";
import { User, Package, Search } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";

export default function AccountPage() {
  const [orderNumber, setOrderNumber] = React.useState("");

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderNumber) {
      // Mock tracking logic since we can't use alert
    }
  };

  return (
    <main className="min-h-screen pt-24 pb-16 bg-slate-950 text-white">
      <Section>
        <Container size="narrow">
          <SectionHeader
            title="My Account"
            description="Manage your orders and preferences."
          />

          <div className="mt-12 space-y-8">
            {/* Order Tracking Section */}
            <div className="rounded-2xl border border-white/5 bg-slate-900 p-8 shadow-premium">
              <div className="flex items-center gap-4 mb-6">
                <div className="grid size-12 place-items-center rounded-full bg-brand-yellow/10 text-brand-yellow">
                  <Package className="size-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Track Order</h3>
                  <p className="text-sm text-slate-400">Enter your order number to see the status.</p>
                </div>
              </div>

              <form onSubmit={handleTrack} className="flex gap-4">
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Search className="size-5 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="e.g. SNV-123456"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 py-3 pl-12 pr-4 text-white placeholder-slate-500 outline-none focus:border-brand-yellow/50 focus:ring-1 focus:ring-brand-yellow/50 transition-all"
                  />
                </div>
                <Button type="submit" variant="gradient" className="px-8">
                  Track
                </Button>
              </form>
            </div>

            {/* Empty State / Login Prompt */}
            <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-white/10 bg-slate-900/50 p-12 text-center shadow-premium backdrop-blur-sm">
              <div className="grid size-20 place-items-center rounded-full bg-slate-800 text-slate-400">
                <User className="size-10" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-white">Login to view your order history</h3>
                <p className="mt-2 text-slate-400">We are currently building our new account system.</p>
              </div>
              <Button disabled variant="outline" className="opacity-50 cursor-not-allowed border-white/10 bg-transparent text-white hover:text-white">
                Login / Register (Coming Soon)
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </main>
  );
}
