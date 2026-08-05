"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShoppingBag,
  Search,
  Heart,
  User,
  Menu,
  X,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { navStructure, siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { openCartDrawer } from "@/components/cart/cart-drawer";
import { useCart } from "@/context/cart-context";

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const { count: cartCount } = useCart();

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    // Auto-open the cart drawer when other components dispatch snv:cart:add.
    const onAdd = () => openCartDrawer();
    window.addEventListener("snv:cart:add", onAdd);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("snv:cart:add", onAdd);
    };
  }, []);

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "py-2" : "py-3 md:py-4"
      )}
    >
      <div className="container">
        <nav
          className={cn(
            "relative flex items-center justify-between gap-4 rounded-2xl border border-transparent px-4 py-2.5 transition-all duration-300 md:px-5",
            scrolled
              ? "glass shadow-lift"
              : "bg-transparent"
          )}
        >
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 font-display font-semibold tracking-tight">
            <span className="relative grid size-9 place-items-center rounded-xl bg-brand-gradient text-primary-foreground shadow-glow">
              <Sparkles className="size-5" />
            </span>
            <span className="hidden text-base sm:block">
              Stix<span className="brand-gradient-text">N</span>Vibes
            </span>
          </Link>

          {/* Desktop nav */}
          <ul className="hidden items-center gap-0.5 lg:flex">
            {navStructure.map((item) => (
              <li key={item.title}>
                {("mega" in item) && item.mega ? (
                  <MegaMenuItem title={item.title} href={item.href} mega={item.mega} />
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "relative rounded-full px-3.5 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground",
                      "highlight" in item && item.highlight && "text-accent"
                    )}
                  >
                    {item.title}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search"
              className="grid size-10 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Search className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Wishlist"
              className="hidden size-10 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground sm:grid"
            >
              <Heart className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Account"
              className="hidden size-10 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground sm:grid"
            >
              <User className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Open cart"
              onClick={() => openCartDrawer()}
              className="relative grid size-10 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ShoppingBag className="size-5" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-brand-yellow text-[10px] font-bold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </button>
            <ThemeToggle />
            <Button
              variant="gradient"
              size="sm"
              className="hidden md:inline-flex ml-1"
              asChild
            >
              <Link href="/customize">Customize</Link>
            </Button>
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-drawer"
              onClick={() => setMobileOpen(true)}
              className="grid size-10 place-items-center rounded-full text-foreground transition-colors hover:bg-secondary lg:hidden"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </nav>
      </div>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <MobileMenu onClose={() => setMobileOpen(false)} />
        )}
      </AnimatePresence>
    </header>
  );
}

type MegaColumn = { title: string; links: readonly { title: string; href: string }[] };

function MegaMenuItem({
  title,
  href,
  mega,
}: {
  title: string;
  href: string;
  mega: readonly MegaColumn[];
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href={href}
        className="flex items-center gap-0.5 rounded-full px-3.5 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"
      >
        {title}
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </Link>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-1/2 top-[calc(100%+8px)] z-50 w-[640px] -translate-x-1/2"
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-6 rounded-2xl border border-border/60 bg-background/95 p-6 shadow-premium backdrop-blur-xl">
              {mega.map((col) => (
                <div key={col.title} className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {col.title}
                  </h4>
                  <ul className="space-y-1.5">
                    {col.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="block rounded-md px-2 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          {link.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const trending = ["Anime Stickers", "Spotify Card Custom", "A3 Posters", "Mystery Pack", "F1 Vinyl", "Marvel"];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-40 bg-background/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="container pt-24"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="mx-auto max-w-2xl"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-premium">
            <Search className="size-5 text-muted-foreground" />
            <input
              autoFocus
              type="search"
              placeholder="Search stickers, posters, cards..."
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden rounded-md border border-border bg-secondary px-2 py-1 text-[10px] font-medium sm:block">ESC</kbd>
            <button onClick={onClose} type="button" aria-label="Close search">
              <X className="size-5" />
            </button>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Trending</p>
            <div className="flex flex-wrap gap-2">
              {trending.map((t) => (
                <Link
                  key={t}
                  href={`/shop?q=${encodeURIComponent(t.toLowerCase())}`}
                  className="rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-sm transition-colors hover:bg-secondary"
                >
                  {t}
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function MobileMenu({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background lg:hidden"
    >
      <div className="container flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2.5 font-display font-semibold" onClick={onClose}>
          <span className="grid size-9 place-items-center rounded-xl bg-brand-gradient text-primary-foreground shadow-glow">
            <Sparkles className="size-5" />
          </span>
          Stix<span className="brand-gradient-text">N</span>Vibes
        </Link>
        <button onClick={onClose} aria-label="Close menu" className="grid size-10 place-items-center rounded-full hover:bg-secondary">
          <X className="size-5" />
        </button>
      </div>
      <div className="container mt-4 space-y-1 overflow-y-auto pb-12">
        {navStructure.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            onClick={onClose}
            className="block rounded-xl px-4 py-3 text-lg font-medium transition-colors hover:bg-secondary"
          >
            {item.title}
          </Link>
        ))}
        <div className="pt-4">
          <Button variant="gradient" size="lg" className="w-full" asChild>
            <Link href="/customize" onClick={onClose}>Start Customizing</Link>
          </Button>
        </div>
        <p className="pt-6 text-sm text-muted-foreground">{siteConfig.description}</p>
      </div>
    </motion.div>
  );
}
