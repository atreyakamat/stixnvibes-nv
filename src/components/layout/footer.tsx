import * as React from "react";
import Link from "next/link";
import { Sparkles, Instagram, Twitter, Youtube, Mail, MapPin, MessageCircle } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-border">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[140%] -translate-x-1/2 bg-brand-mesh opacity-60 blur-3xl" />
      <div className="relative container py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-6">
          <div className="col-span-2 space-y-3 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 font-display font-semibold tracking-tight">
              <span className="grid size-9 place-items-center rounded-xl bg-brand-gradient text-primary-foreground shadow-glow">
                <Sparkles className="size-5" />
              </span>
              Stix<span className="brand-gradient-text">N</span>Vibes
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm">
              {siteConfig.description}
            </p>
            <div className="flex items-center gap-2">
              {[
                { Icon: Instagram, href: siteConfig.social.instagram, label: "Instagram" },
                { Icon: Twitter, href: siteConfig.social.twitter, label: "Twitter" },
                { Icon: Youtube, href: siteConfig.social.youtube, label: "YouTube" },
                { Icon: MessageCircle, href: siteConfig.social.whatsapp, label: "WhatsApp" },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="grid size-9 place-items-center rounded-full border border-border bg-background/60 text-foreground/70 transition-all hover:border-brand-yellow hover:text-brand-yellow hover:shadow-glow"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li><Link className="hover:text-primary" href="/shop/stickers">Stickers</Link></li>
              <li><Link className="hover:text-primary" href="/shop/posters">Posters</Link></li>
              <li><Link className="hover:text-primary" href="/shop/spotify-cards">Spotify Cards</Link></li>
              <li><Link className="hover:text-primary" href="/shop/frames">Frames</Link></li>
              <li><Link className="hover:text-primary" href="/shop/mystery">Mystery Packs</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link className="hover:text-primary" href="/about">About</Link></li>
              <li><Link className="hover:text-primary" href="/contact">Contact</Link></li>
              <li><Link className="hover:text-primary" href="/faq">FAQ</Link></li>
              <li><Link className="hover:text-primary" href="/customize">Custom Orders</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link className="hover:text-primary" href="/policies/shipping">Shipping</Link></li>
              <li><Link className="hover:text-primary" href="/policies/refund">Refunds</Link></li>
              <li><Link className="hover:text-primary" href="/policies/privacy">Privacy</Link></li>
              <li><Link className="hover:text-primary" href="/policies/terms">Terms</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Reach Out</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Mail className="size-4" /> {siteConfig.social.email}</li>
              <li className="flex items-center gap-2"><MapPin className="size-4" /> {siteConfig.contact.address}</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {year} {siteConfig.name}. Made with stickers & sunshine in India.</p>
          <p className="flex items-center gap-2">
            Designed & built for vibes.
            <span className="brand-gradient-text font-semibold">Stick loud.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
