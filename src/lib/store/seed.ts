import type { Collection, CustomField, Offer, OptionGroup, Product, Settings } from "@/lib/types";
import { DEFAULT_WHATSAPP } from "../whatsapp";

// Starter catalog and option templates. Sticker prices and the two offers
// come from Atreya (23 Oct 2026). Poster, music card and wall card prices
// aren't set yet, so those show "Ask on WhatsApp" until set in admin.

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
    details: "A super sheet packed with stickers. Want more than a few sheets? Message us for bulk pricing.",
  },
  poster: {
    options: [
      {
        id: "size",
        name: "Size",
        values: [
          { id: "a4", label: "A4", priceDeltaPaise: 0 },
          { id: "a3", label: "A3", priceDeltaPaise: 0 },
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
      {
        id: "frame",
        name: "Frame",
        values: [
          { id: "none", label: "No frame", priceDeltaPaise: 0 },
          { id: "framed", label: "Framed", priceDeltaPaise: 0 },
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
      pricePaise: 6500,
      featured: true,
      badge: "Best value",
    }),
    base("custom-poster", "poster", "Your poster", "Pick a design and we'll print it as a poster. A4 or A3, sticker or normal, framed or not.", ["/lofi/lofi-03.webp"], {
      customFields: [{ id: "design", label: "Which design?", kind: "text", required: false, help: "A design name from the shop, or describe what you want." }],
    }),
    base("music-card", "music-card", "Music card", "Dedicate a song. Your photo or the album cover with a scannable Spotify code.", ["/lofi/lofi-15.webp"], { featured: true, badge: "Gift" }),
    base("wall-cards", "wall-card", "Wall cards", "10 × 10 cm cards for your wall corners and grids.", ["/lofi/lofi-06.webp"], { status: "upcoming" }),
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

export function seedOffers(): Offer[] {
  return [
    { id: "o-stickers", name: "Buy 4 stickers, get 1 free", description: "Every 5th sticker is on us.", productType: "sticker", buy: 4, free: 1, active: true, sortOrder: 0 },
    { id: "o-posters", name: "Buy 5 posters, get 1 free", description: "Every 6th poster is on us.", productType: "poster", buy: 5, free: 1, active: true, sortOrder: 1 },
  ];
}

export const DEFAULT_SETTINGS: Settings = {
  storeOpen: true,
  announcement: "",
  whatsappNumber: DEFAULT_WHATSAPP,
  orderNote: "Send the order on WhatsApp. We confirm it, share the UPI details, and pack it once paid.",
  deliveryNote: "Dispatched within 2 days.",
  bulkNote: "Ordering in bulk for a club, fest or shop? Message us for sheet pricing.",
};

export const DEMO_SETTINGS: Settings = {
  ...DEFAULT_SETTINGS,
  announcement: "Preview: orders here are not real.",
};

/** Demo catalog: same as the seed, with sample prices so every flow works. */
export function demoProducts(): Product[] {
  const demo: Record<string, number> = { poster: 9900, "music-card": 14900, "wall-card": 4900 };
  return seedProducts().map((p) => {
    if (p.pricePaise !== null || !(p.type in demo)) return p;
    const options = p.options.map((g) =>
      g.id === "size" ? { ...g, values: g.values.map((v) => (v.id === "a3" ? { ...v, priceDeltaPaise: 5000 } : v)) } : g.id === "frame" ? { ...g, values: g.values.map((v) => (v.id === "framed" ? { ...v, priceDeltaPaise: 15000 } : v)) } : g,
    );
    return { ...p, pricePaise: demo[p.type], options };
  });
}
