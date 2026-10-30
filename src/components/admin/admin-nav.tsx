"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/wordmark";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/packing", label: "Packing" },
  { href: "/admin/stalls", label: "Stalls" },
  { href: "/admin/custom", label: "Custom requests" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/offers", label: "Offers" },
  { href: "/admin/coupons", label: "Codes & QR" },
  { href: "/admin/sheets", label: "Cricut sheets" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/gallery", label: "Library" },
  { href: "/admin/colleges", label: "Colleges" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav({ email, logout }: { email: string; logout: () => Promise<void> }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));
  return (
    <nav aria-label="Admin" className="flex h-full flex-col gap-4 p-4 md:p-6">
      <Link href="/admin" className="flex items-baseline gap-2">
        <Wordmark className="text-xl" />
        <span className="label text-lemon">Admin</span>
      </Link>
      <ul className="flex gap-1 overflow-x-auto md:mt-6 md:flex-col">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={active(l.href) ? "page" : undefined}
              className={`block whitespace-nowrap rounded-xl px-3 py-2 text-sm transition-colors ${
                active(l.href) ? "bg-lemon text-ink" : "text-paper/75 hover:bg-paper/5 hover:text-paper"
              }`}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="hidden space-y-3 text-sm md:mt-auto md:block">
        <Link href="/" className="block text-mute hover:text-lemon">
          View shop ↗
        </Link>
        <p className="truncate text-mute" title={email}>
          {email}
        </p>
        <form action={logout}>
          <button type="submit" className="text-paper/75 underline-offset-4 hover:text-lemon hover:underline">
            Log out
          </button>
        </form>
      </div>
    </nav>
  );
}
