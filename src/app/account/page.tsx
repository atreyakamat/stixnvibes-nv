import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Account — Stix N Vibes",
  description: "Your account dashboard.",
  alternates: { canonical: "/account" },
};

export default function AccountPage() {
  return (
    <Container className="pt-28 pb-12 md:pt-36">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
        <h1 className="font-display text-2xl font-semibold">Account</h1>
        <p className="mt-1 text-muted-foreground text-sm">Order history, wishlist, downloads and settings will appear here.</p>
        <p className="mt-2 text-xs text-muted-foreground">For now, drop us a WhatsApp message to track an order.</p>
        <div className="mt-4 flex flex-col gap-2">
          <Button asChild variant="gradient" className="shadow-glow"><Link href="/shop">Continue shopping</Link></Button>
          <Button asChild variant="outline"><Link href="/">Back home</Link></Button>
        </div>
      </div>
    </Container>
  );
}
