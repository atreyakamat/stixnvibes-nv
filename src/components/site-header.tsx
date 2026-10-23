"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { nav, site } from "@/content/site";
import { useCart } from "./cart/cart-context";
import { Wordmark } from "./wordmark";

export function SiteHeader({ notice }: { notice?: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { count, ready, setDrawerOpen } = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the menu on navigation (state adjusted during render, not in an effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* Reserves space for the fixed header so content never hides under it. */}
      <div aria-hidden="true" className={notice ? "h-[6.25rem] md:h-[7.25rem]" : "h-16 md:h-20"} />
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-300 ${
          scrolled || open ? "glass border-b border-line/50" : "border-b border-transparent bg-ink/60"
        }`}
      >
        {notice && (
          <p className="bg-lemon px-4 py-2 text-center text-sm font-medium text-ink" role="status">
            {notice}
          </p>
        )}
        <div className="container-x flex h-16 items-center justify-between gap-6 md:h-20">
          <Link href="/" aria-label="Stix N Vibes shop home" className="relative z-10 flex items-baseline gap-2">
            <Wordmark />
            <span className="label hidden text-lemon sm:inline">Shop</span>
          </Link>

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-7 text-sm">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-paper/75 transition-colors hover:text-lemon"
                    aria-current={pathname === item.href ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <a href={site.mainSite} className="text-paper/50 transition-colors hover:text-lemon">
                  stixnvibes.com <span aria-hidden="true">↗</span>
                </a>
              </li>
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="btn btn-primary !px-4 !py-3"
              aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 7h12l-1 13H7L6 7Z" strokeLinejoin="round" />
                <path d="M9 7a3 3 0 0 1 6 0" />
              </svg>
              <span className="tabular-nums" data-testid="cart-count">
                {ready ? count : 0}
              </span>
            </button>
            <button
              ref={toggleRef}
              type="button"
              className="relative z-10 grid size-11 place-items-center rounded-full ring-1 ring-paper/25 lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((v) => !v)}
            >
              <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
              <span aria-hidden="true" className="relative block h-3 w-5">
                <span
                  className={`absolute left-0 h-0.5 w-5 bg-paper transition-transform duration-300 ${open ? "top-1.5 rotate-45" : "top-0"}`}
                />
                <span
                  className={`absolute left-0 h-0.5 w-5 bg-paper transition-transform duration-300 ${open ? "top-1.5 -rotate-45" : "top-3"}`}
                />
              </span>
            </button>
          </div>
        </div>

        <div id="mobile-menu" hidden={!open} className="fixed inset-x-0 bottom-0 top-16 bg-ink lg:hidden">
          <nav aria-label="Mobile" className="container-x flex h-full flex-col justify-between pb-10 pt-8">
            <ul className="space-y-1">
              {nav.map((item, i) => (
                <li key={item.href}>
                  <Link href={item.href} className="display flex items-baseline gap-4 py-2 text-5xl hover:text-lemon">
                    <span className="label text-mute">0{i + 1}</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <a href={site.mainSite} className="btn btn-ghost self-start">
              Back to stixnvibes.com
            </a>
          </nav>
        </div>
      </header>
    </>
  );
}
