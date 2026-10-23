import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopBrowser } from "@/components/product/shop-browser";
import { getShopState } from "@/lib/shop";
import { CATEGORIES } from "@/lib/types";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Shop all",
  description: "Waterproof stickers, sticker packs, posters and Framez from Stix N Vibes.",
};

export default async function ShopPage() {
  const { products } = await getShopState();
  const categories = CATEGORIES.filter((c) => products.some((p) => p.category === c.id));

  return (
    <section className="container-x pb-8 pt-10 md:pt-16">
      <p className="label text-mute">Shop</p>
      <h1 className="display mt-4 text-[clamp(3.2rem,10vw,8rem)]">
        Find your <span className="text-lemon">vibe</span>
      </h1>
      <Suspense>
        <ShopBrowser products={products} categories={categories.map((c) => ({ id: c.id, label: c.label }))} />
      </Suspense>
    </section>
  );
}
