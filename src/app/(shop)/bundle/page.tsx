import type { Metadata } from "next";
import { BundleBuilder } from "@/components/product/bundle-builder";
import { canOrder } from "@/lib/pricing";
import { getShopState } from "@/lib/shop";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Build a sticker pack",
  description: "Pick your own pack of Stix N Vibes stickers. Buy 4, get the 5th free.",
  alternates: { canonical: "/bundle" },
};

export default async function BundlePage() {
  const { products, offers } = await getShopState();
  const stickers = products.filter((p) => p.type === "sticker" && p.status === "live" && p.pricePaise !== null && p.customFields.every((f) => !f.required));
  const offer = offers.filter((o) => o.kind === "bxgy" && (o.productType === "sticker" || o.productType === null)).sort((a, b) => a.sortOrder - b.sortOrder)[0];
  const deal = offer ? { buy: offer.buy, free: offer.free, name: offer.name } : null;
  return (
    <section className="container-x pt-10 md:pt-16">
      <p className="label text-mute">Sticker packs</p>
      <h1 className="display mt-3 text-[clamp(2.8rem,8vw,6rem)]">
        Build your <span className="text-lemon">pack</span>
      </h1>
      <p className="mt-4 max-w-xl text-lg text-paper/75">
        {deal ? `Pick any ${deal.buy + deal.free}: ${deal.name.toLowerCase()}. ` : "Pick the stickers you want. "}Tap a sticker to add it, tap again for another copy.
      </p>
      <div className="mt-8">{stickers.some(canOrder) ? <BundleBuilder stickers={stickers} deal={deal} /> : <p className="text-paper/70">Stickers are being restocked.</p>}</div>
    </section>
  );
}
