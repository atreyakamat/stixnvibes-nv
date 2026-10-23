import type { Metadata } from "next";
import { Suspense } from "react";
import { OfferStrip } from "@/components/offer-strip";
import { ShopBrowser } from "@/components/product/shop-browser";
import { getShopState } from "@/lib/shop";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Shop all",
  description: "Stickers from ₹10, super sheets, A4 and A3 posters, Spotify music cards and wall cards. Order on WhatsApp.",
};

export default async function ShopPage() {
  const { products, collections, offers } = await getShopState();

  return (
    <section className="container-x pb-8 pt-10 md:pt-16">
      <p className="label text-mute">Shop</p>
      <h1 className="display mt-4 text-[clamp(3.2rem,10vw,8rem)]">
        Find your <span className="text-lemon">vibe</span>
      </h1>
      <OfferStrip offers={offers} className="mt-6" />
      <Suspense>
        <ShopBrowser products={products} collections={collections} />
      </Suspense>
    </section>
  );
}
