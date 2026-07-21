import type { Metadata } from "next";
import { ShopView } from "@/components/shop/shop-view";

export const metadata: Metadata = {
  title: "Shop — Stix N Vibes",
  description: "Browse premium stickers, posters, Spotify cards, frames and mystery packs. Filter by price, material, theme, and colour.",
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Shop — Stix N Vibes",
    description: "The full Stix N Vibes catalog — premium stickers, posters, frames & more.",
    url: "/shop",
  },
};

export default function ShopPage() {
  return <ShopView />;
}
