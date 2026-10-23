import type { Product, Settings } from "@/lib/types";

// Starter catalog: the 17 lo-fi designs already on stixnvibes.com plus one
// pack. Prices are null on purpose; they get set in admin. Demo mode fills
// in clearly-labelled demo prices so the checkout can be tried end to end.

const NOW = "2026-10-23T00:00:00.000Z";
const pad = (n: number) => String(n).padStart(2, "0");

export const STICKER_DETAILS =
  "Printed on waterproof paper vinyl. Handles splashes, bottles and bags. Peel and stick on any clean, smooth surface.";

function sticker(n: number): Product {
  const id = `lofi-${pad(n)}`;
  return {
    id: `p-${id}`,
    slug: id,
    name: `Lo-fi sticker ${pad(n)}`,
    category: "stickers",
    description: "From our lo-fi series.",
    details: STICKER_DETAILS,
    images: [`/lofi/${id}.webp`],
    tags: ["lo-fi"],
    active: true,
    featured: n <= 8,
    sortOrder: n,
    variants: [{ id: `v-${id}`, label: "Single sticker", pricePaise: null, stock: null, active: true, sortOrder: 0 }],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

export function seedProducts(): Product[] {
  return [
    ...Array.from({ length: 17 }, (_, i) => sticker(i + 1)),
    {
      id: "p-lofi-pack",
      slug: "lofi-pack",
      name: "Lo-fi sticker pack",
      category: "packs",
      description: "A set of lo-fi designs that belong together. Pick a pack. Set your vibe.",
      details: STICKER_DETAILS,
      images: ["/lofi/lofi-09.webp", "/lofi/lofi-12.webp", "/lofi/lofi-07.webp"],
      tags: ["lo-fi", "pack"],
      active: true,
      featured: true,
      sortOrder: 0,
      variants: [{ id: "v-lofi-pack", label: "Pack", pricePaise: null, stock: null, active: true, sortOrder: 0 }],
      createdAt: NOW,
      updatedAt: NOW,
    },
  ];
}

/** Production defaults: closed until the owner sets prices and payment. */
export const DEFAULT_SETTINGS: Settings = {
  storeOpen: false,
  announcement: "",
  shippingEnabled: true,
  shippingFeePaise: 0,
  freeShippingAbovePaise: null,
  shipsTo: "",
  dispatchNote: "We dispatch within 2 days.",
  pickupEnabled: false,
  pickupNote: "",
  upiEnabled: false,
  upiVpa: "",
  upiPayee: "Stix N Vibes",
  minOrderPaise: 0,
};

export const DEMO_SETTINGS: Settings = {
  ...DEFAULT_SETTINGS,
  storeOpen: true,
  announcement: "Preview mode: demo prices, and orders are not real.",
  shippingFeePaise: 4900,
  freeShippingAbovePaise: 49900,
  shipsTo: "All India (demo)",
  pickupEnabled: true,
  pickupNote: "Collect at our next Sunday stall in Goa (demo).",
  upiEnabled: true,
  upiVpa: "demo@upi",
  upiPayee: "Stix N Vibes (demo)",
};

export function demoProducts(): Product[] {
  return seedProducts().map((p) => ({
    ...p,
    variants: p.variants.map((v) => ({ ...v, pricePaise: p.category === "packs" ? 19900 : 4900 })),
  }));
}
