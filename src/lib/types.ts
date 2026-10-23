// Shared domain types. Money is always integer paise (₹1 = 100 paise) so
// totals never pick up floating point drift.

export const PRODUCT_TYPES = [
  { id: "sticker", label: "Stickers", one: "Sticker", blurb: "Single stickers in paper vinyl or waterproof. Mix any designs." },
  { id: "sheet", label: "Sticker sheets", one: "Sticker sheet", blurb: "Super sheets packed with stickers. The bulk deal." },
  { id: "poster", label: "Posters", one: "Poster", blurb: "A4 or A3, sticker or normal print, framed or not. Your call." },
  { id: "music-card", label: "Music cards", one: "Music card", blurb: "A Spotify code with your photo or the album cover. Dedicate a song." },
  { id: "wall-card", label: "Wall cards", one: "Wall card", blurb: "10 × 10 cm cards for corners, desks and wall grids." },
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number]["id"];
export const PRODUCT_TYPE_IDS = PRODUCT_TYPES.map((t) => t.id) as [ProductType, ...ProductType[]];
export const typeLabel = (id: string) => PRODUCT_TYPES.find((t) => t.id === id)?.label ?? id;

/** live: orderable. upcoming: shown as "coming soon". hidden: admin only. */
export const PRODUCT_STATUSES = ["live", "upcoming", "hidden"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export type OptionValue = {
  id: string;
  label: string;
  /** Added to the base price when picked. Can be 0. */
  priceDeltaPaise: number;
};

/** A choice the customer makes, e.g. Size: A4 / A3. First value is the default. */
export type OptionGroup = {
  id: string;
  name: string;
  values: OptionValue[];
};

export const CUSTOM_FIELD_KINDS = ["text", "textarea", "link", "image"] as const;
export type CustomFieldKind = (typeof CUSTOM_FIELD_KINDS)[number];

/** Something the customer fills in, e.g. a Spotify link or a photo. */
export type CustomField = {
  id: string;
  label: string;
  kind: CustomFieldKind;
  required: boolean;
  help: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  type: ProductType;
  collectionIds: string[];
  description: string;
  /** Material, size and care notes shown on the product page. */
  details: string;
  images: string[];
  tags: string[];
  status: ProductStatus;
  featured: boolean;
  soldOut: boolean;
  /** Short label on the card, e.g. "New" or "Bestseller". */
  badge: string;
  sortOrder: number;
  /** null = no price online; customers ask on WhatsApp. */
  pricePaise: number | null;
  /** Optional "was" price shown struck through. */
  compareAtPaise: number | null;
  options: OptionGroup[];
  customFields: CustomField[];
  createdAt: string;
  updatedAt: string;
};

export type Collection = {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Cover image; falls back to the first product's image. */
  image: string;
  active: boolean;
  featured: boolean;
  sortOrder: number;
  createdAt: string;
};

/** Buy `buy`, get `free` free, on products of one type (or all types). */
export type Offer = {
  id: string;
  name: string;
  description: string;
  productType: ProductType | null;
  buy: number;
  free: number;
  active: boolean;
  sortOrder: number;
};

export const ORDER_STATUSES = ["new", "confirmed", "paid", "shipped", "done", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderLine = {
  productId: string;
  slug: string;
  name: string;
  type: ProductType;
  image: string | null;
  /** "Size: A3" style labels for the picked options. */
  options: string[];
  /** Filled-in custom fields. Image fields hold an upload link. */
  custom: { label: string; value: string; kind: CustomFieldKind }[];
  unitPricePaise: number;
  qty: number;
  lineTotalPaise: number;
};

export type AppliedOffer = { offerId: string; name: string; freeUnits: number; discountPaise: number };

/** An order sent to WhatsApp. Payment and delivery are sorted in the chat. */
export type Order = {
  id: string;
  number: string;
  status: OrderStatus;
  customerName: string;
  customerNote: string;
  lines: OrderLine[];
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  offers: AppliedOffer[];
  adminNote: string;
  createdAt: string;
  updatedAt: string;
};

export const EVENT_TYPES = ["view", "add_to_cart", "order_click", "ask_click"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export type Upload = { id: string; path: string; contentType: string };

export type Settings = {
  /** When off, the cart is replaced by "message us" buttons. */
  storeOpen: boolean;
  announcement: string;
  /** Country code + number, digits only, e.g. 917744020601. */
  whatsappNumber: string;
  /** Shown in the cart and the WhatsApp message, e.g. how payment works. */
  orderNote: string;
  deliveryNote: string;
  bulkNote: string;
};

export type Stats = {
  views: number;
  addToCart: number;
  orderClicks: number;
  askClicks: number;
  orders: number;
  orderValuePaise: number;
  topViewed: { productId: string; count: number }[];
  topOrdered: { productId: string; qty: number }[];
  daily: { day: string; views: number; orders: number }[];
};
