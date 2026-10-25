import type { Collection, CustomField, Offer, OptionGroup, Product, Settings } from "@/lib/types";
import { DEFAULT_INSTAGRAM } from "../instagram";

// Starter catalog, option templates and offers. Prices and offers come from
// Atreya (23 Oct 2026): stickers ₹10 (buy 4 get 1), super sheets ₹80 (₹65
// each for 11+), posters A4 ₹60 / A3 ₹100 / A4 framed ₹200 / A3 framed ₹400
// (buy 5 get 1), music cards ₹20 (min 5), wall cards ₹30 (₹25 for 6+, ₹20
// for 11+), free shipping above ₹250.

const NOW = "2026-10-23T00:00:00.000Z";
const pad = (n: number) => String(n).padStart(2, "0");

export const STICKER_DETAILS =
  "Paper vinyl or waterproof vinyl, your pick. Waterproof handles splashes, bottles and bags. Peel and stick on any clean, smooth surface.";

/** Option and field templates the admin can apply with one click. */
export const TEMPLATES: Record<string, { options: OptionGroup[]; customFields: CustomField[]; details: string }> = {
  sticker: {
    options: [
      {
        id: "material",
        name: "Material",
        values: [
          { id: "paper-vinyl", label: "Paper vinyl", priceDeltaPaise: 0 },
          { id: "waterproof", label: "Waterproof", priceDeltaPaise: 0 },
        ],
      },
    ],
    customFields: [],
    details: STICKER_DETAILS,
  },
  sheet: {
    options: [
      {
        id: "material",
        name: "Material",
        values: [
          { id: "paper-vinyl", label: "Paper vinyl", priceDeltaPaise: 0 },
          { id: "waterproof", label: "Waterproof", priceDeltaPaise: 0 },
        ],
      },
    ],
    customFields: [{ id: "designs", label: "Designs you want on the sheet", kind: "textarea", required: false, help: "List design names, or leave blank and we'll pick a mix." }],
    details: "A super sheet packed with stickers. More than 10 sheets? They drop to the bulk price automatically.",
  },
  poster: {
    options: [
      // Size and frame are one choice because the frame costs more on A3.
      // Price changes are on top of the ₹60 A4 base.
      {
        id: "size",
        name: "Size",
        values: [
          { id: "a4", label: "A4", priceDeltaPaise: 0 },
          { id: "a3", label: "A3", priceDeltaPaise: 4000 },
          { id: "a4-framed", label: "A4 framed", priceDeltaPaise: 14000 },
          { id: "a3-framed", label: "A3 framed", priceDeltaPaise: 34000 },
        ],
      },
      {
        id: "print",
        name: "Print",
        values: [
          { id: "normal", label: "Normal print", priceDeltaPaise: 0 },
          { id: "sticker", label: "Sticker (peel and paste)", priceDeltaPaise: 0 },
        ],
      },
    ],
    customFields: [],
    details: "A4 (21 × 29.7 cm) or A3 (29.7 × 42 cm). Sticker posters peel and paste straight onto the wall: no frame, no nails.",
  },
  "music-card": {
    options: [],
    customFields: [
      { id: "song", label: "Spotify song link", kind: "link", required: true, help: "In Spotify: Share → Copy link, then paste it here." },
      { id: "photo", label: "Your photo", kind: "image", required: false, help: "Leave blank to use the album cover." },
      { id: "for", label: "Dedicated to", kind: "text", required: false, help: "A name, a nickname, an inside joke." },
      { id: "message", label: "Message on the card", kind: "textarea", required: false, help: "Optional. Keep it short." },
    ],
    details: "A scannable Spotify code with your photo or the album cover. Scan it with Spotify and the song plays.",
  },
  "wall-card": {
    options: [],
    customFields: [],
    details: "10 × 10 cm cards for wall corners, desk setups and grids.",
  },
};

function sticker(n: number): Product {
  const id = `lofi-${pad(n)}`;
  const t = TEMPLATES.sticker;
  return {
    id: `p-${id}`,
    slug: id,
    name: `Lo-fi ${pad(n)}`,
    type: "sticker",
    collectionIds: ["c-lofi"],
    description: "From our lo-fi collection.",
    details: t.details,
    images: [`/lofi/${id}.webp`],
    tags: ["lo-fi"],
    status: "live",
    featured: n <= 8,
    soldOut: false,
    badge: "",
    sortOrder: n,
    pricePaise: 1000,
    compareAtPaise: null,
    minQty: 1,
    options: structuredClone(t.options),
    customFields: [],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function base(id: string, type: Product["type"], name: string, description: string, images: string[], extra: Partial<Product> = {}): Product {
  const t = TEMPLATES[type];
  return {
    id: `p-${id}`,
    slug: id,
    name,
    type,
    collectionIds: [],
    description,
    details: t.details,
    images,
    tags: [],
    status: "live",
    featured: false,
    soldOut: false,
    badge: "",
    sortOrder: 0,
    pricePaise: null,
    compareAtPaise: null,
    minQty: 1,
    options: structuredClone(t.options),
    customFields: structuredClone(t.customFields),
    createdAt: NOW,
    updatedAt: NOW,
    ...extra,
  };
}

export function seedProducts(): Product[] {
  return [
    ...Array.from({ length: 17 }, (_, i) => sticker(i + 1)),
    base("lofi-super-sheet", "sheet", "Lo-fi super sheet", "A whole sheet of lo-fi stickers. The best value per sticker.", ["/lofi/lofi-09.webp", "/lofi/lofi-12.webp"], {
      collectionIds: ["c-lofi"],
      pricePaise: 8000,
      featured: true,
      badge: "Best value",
    }),
    base("custom-poster", "poster", "Your poster", "Pick a design and we'll print it as a poster. A4 or A3, sticker or normal, framed or not.", ["/lofi/lofi-03.webp"], {
      pricePaise: 6000,
      customFields: [{ id: "design", label: "Which design?", kind: "text", required: false, help: "A design name from the shop, or describe what you want." }],
    }),
    base("music-card", "music-card", "Music card", "Dedicate a song. Your photo or the album cover with a scannable Spotify code. Minimum 5 cards per order.", ["/lofi/lofi-15.webp"], {
      pricePaise: 2000,
      minQty: 5,
      featured: true,
      badge: "Gift",
    }),
    base("wall-cards", "wall-card", "Wall cards", "10 × 10 cm cards for your wall corners and grids. ₹25 each for 6 or more, ₹20 each for 11 or more.", ["/lofi/lofi-06.webp"], {
      pricePaise: 3000,
    }),
  ];
}

export function seedCollections(): Collection[] {
  return [
    {
      id: "c-lofi",
      slug: "lo-fi",
      name: "Lo-fi",
      description: "Late-night study vibes, cosy rooms and rainy windows.",
      image: "/lofi/lofi-07.webp",
      active: true,
      featured: true,
      sortOrder: 0,
      createdAt: NOW,
    },
  ];
}

/** Defaults for the fields only campaigns use. */
export const NO_CAMPAIGN = { percent: null, startsAt: null, endsAt: null, banner: "" } as const;

export function seedOffers(): Offer[] {
  return [
    { id: "o-stickers", kind: "bxgy", name: "Buy 4 stickers, get 1 free", description: "Every 5th sticker is on us.", productType: "sticker", buy: 4, free: 1, pricePaise: null, ...NO_CAMPAIGN, active: true, sortOrder: 0 },
    { id: "o-posters", kind: "bxgy", name: "Buy 5 posters, get 1 free", description: "Every 6th poster is on us.", productType: "poster", buy: 5, free: 1, pricePaise: null, ...NO_CAMPAIGN, active: true, sortOrder: 1 },
    { id: "o-sheets-11", kind: "volume", name: "11+ sheets at ₹65 each", description: "Bulk price on super sheets.", productType: "sheet", buy: 11, free: 1, pricePaise: 6500, ...NO_CAMPAIGN, active: true, sortOrder: 2 },
    { id: "o-wall-6", kind: "volume", name: "6+ wall cards at ₹25 each", description: "", productType: "wall-card", buy: 6, free: 1, pricePaise: 2500, ...NO_CAMPAIGN, active: true, sortOrder: 3 },
    { id: "o-wall-11", kind: "volume", name: "11+ wall cards at ₹20 each", description: "", productType: "wall-card", buy: 11, free: 1, pricePaise: 2000, ...NO_CAMPAIGN, active: true, sortOrder: 4 },
  ];
}

export const DEFAULT_SETTINGS: Settings = {
  storeOpen: true,
  announcement: "",
  instagramHandle: DEFAULT_INSTAGRAM,
  orderNote: "Send us the order on Instagram. We confirm it, share the UPI details, and pack it once paid.",
  deliveryNote: "Dispatched within 2 days.",
  bulkNote: "Ordering in bulk for a club, fest or shop? Message us and we'll quote.",
  freeShippingAbovePaise: 25000,
  upiId: "",
  upiName: "Stix N Vibes",
  mrpMarkupPercent: 20,
};

export const DEMO_SETTINGS: Settings = {
  ...DEFAULT_SETTINGS,
  announcement: "Preview: orders here are not real.",
};

/** Demo catalog: the seed, which is fully priced. */
export function demoProducts(): Product[] {
  return seedProducts();
}
