import Link from "next/link";
import { ProductCard } from "@/components/product/product-card";
import { Reveal } from "@/components/reveal";
import { site } from "@/content/site";
import { getShopState } from "@/lib/shop";
import { CATEGORIES } from "@/lib/types";

export const revalidate = 60;

const HERO_STICKERS = [
  { src: "/lofi/lofi-07.webp", className: "left-[4%] top-[8%] w-[30%] -rotate-12" },
  { src: "/lofi/lofi-12.webp", className: "right-[6%] top-[2%] w-[28%] rotate-6" },
  { src: "/lofi/lofi-02.webp", className: "left-[22%] bottom-[4%] w-[32%] rotate-3" },
  { src: "/lofi/lofi-14.webp", className: "right-[10%] bottom-[10%] w-[26%] -rotate-6" },
];

export default async function HomePage() {
  const { products, settings } = await getShopState();
  const featured = products.filter((p) => p.featured).slice(0, 8);
  const shown = featured.length ? featured : products.slice(0, 8);
  const liveCategories = CATEGORIES.filter((c) => products.some((p) => p.category === c.id));

  return (
    <>
      <section className="container-x grid items-center gap-10 pb-16 pt-10 md:grid-cols-2 md:pb-24 md:pt-16">
        <div>
          <p className="label fade-up text-mute">The Stix N Vibes shop</p>
          <h1 className="display mt-5 text-[clamp(3.4rem,10vw,8.5rem)]">
            <span className="rise-line">
              <span style={{ ["--d" as string]: "80ms" }}>Your stickers.</span>
            </span>
            <span className="rise-line">
              <span style={{ ["--d" as string]: "180ms" }} className="text-lemon">
                Your vibe.
              </span>
            </span>
          </h1>
          <p className="fade-up mt-6 max-w-md text-lg text-paper/75" style={{ ["--d" as string]: "300ms" }}>
            Waterproof stickers, packs and posters from a student-led brand in Goa. Order online
            {settings?.pickupEnabled ? " or pick up at our next stall." : "."}
          </p>
          <div className="fade-up mt-8 flex flex-wrap gap-3" style={{ ["--d" as string]: "400ms" }}>
            <Link href="/shop" className="btn btn-primary">
              Shop now
            </Link>
            <Link href="/custom" className="btn btn-ghost">
              Make it custom
            </Link>
          </div>
        </div>
        <div className="relative aspect-square w-full" aria-hidden="true">
          <div className="ice absolute inset-[6%] rounded-[2rem] border border-line" />
          {HERO_STICKERS.map((s, i) => (
            <img
              key={s.src}
              src={s.src}
              alt=""
              className={`drop-in sticker-shadow absolute h-auto ${s.className}`}
              style={{ ["--d" as string]: `${300 + i * 120}ms` }}
              fetchPriority={i === 0 ? "high" : undefined}
            />
          ))}
        </div>
      </section>

      {liveCategories.length > 0 && (
        <section className="container-x" aria-labelledby="cats">
          <h2 id="cats" className="sr-only">
            Categories
          </h2>
          <ul className="flex flex-wrap gap-3">
            {liveCategories.map((c) => (
              <li key={c.id}>
                <Link href={`/shop?category=${c.id}`} className="btn btn-ghost">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="container-x pt-16 md:pt-24" aria-labelledby="featured">
        <div className="flex items-end justify-between gap-6">
          <h2 id="featured" className="display text-[clamp(2.6rem,7vw,5.5rem)]">
            Fresh <span className="text-lemon">drops</span>
          </h2>
          <Link href="/shop" className="label text-mute hover:text-lemon">
            See all →
          </Link>
        </div>
        {shown.length ? (
          <ul className="mt-10 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            {shown.map((p, i) => (
              <li key={p.id}>
                <Reveal delay={(i % 4) * 70} className="h-full">
                  <ProductCard product={p} />
                </Reveal>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-10 text-paper/70">The catalog is being stocked. Check back soon.</p>
        )}
      </section>

      <section className="container-x pt-24 md:pt-32" aria-labelledby="how">
        <h2 id="how" className="display text-[clamp(2.6rem,7vw,5.5rem)]">
          How it <span className="text-lemon">works</span>
        </h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { t: "Pick your vibe", b: "Add stickers, packs or posters to your cart." },
            {
              t: "Pay with UPI",
              b: settings?.pickupEnabled
                ? "Scan and pay from any UPI app, or pay when you collect at a stall."
                : "Scan and pay from any UPI app. No card needed.",
            },
            { t: "Stick it", b: settings?.dispatchNote || "We pack it and send it your way." },
          ].map((s, i) => (
            <li key={s.t} className="rounded-[1.5rem] border border-line p-6 md:p-8">
              <span className="label text-lemon">0{i + 1}</span>
              <h3 className="display mt-4 text-4xl">{s.t}</h3>
              <p className="mt-3 text-paper/70">{s.b}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container-x pt-24 md:pt-32">
        <Reveal className="relative overflow-hidden rounded-[2rem] border border-line px-6 py-16 text-center md:px-16 md:py-24">
          <img src="/lofi/lofi-04.webp" alt="" className="sticker-shadow absolute left-6 top-6 hidden w-28 -rotate-12 md:block" />
          <img src="/lofi/lofi-13.webp" alt="" className="sticker-shadow absolute bottom-6 right-6 hidden w-32 rotate-12 md:block" />
          <h2 className="display text-[clamp(2.8rem,9vw,8rem)]">Got your own design?</h2>
          <p className="mx-auto mt-6 max-w-lg text-paper/75">
            Send us your artwork, logo or idea. We cut it into stickers in any shape.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/custom" className="btn btn-primary">
              Start a custom order
            </Link>
            <a href={site.contact.instagramDm} className="btn btn-ghost" target="_blank" rel="noopener">
              DM us on Instagram
            </a>
          </div>
        </Reveal>
      </section>
    </>
  );
}
