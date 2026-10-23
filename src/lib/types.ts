// Shared domain types. Money is always integer paise (₹1 = 100 paise) so
// totals never pick up floating point drift.

export const CATEGORIES = [
  { id: "stickers", label: "Stickers", blurb: "Waterproof vinyl stickers for laptops, bottles and everything else." },
  { id: "packs", label: "Sticker packs", blurb: "Curated sets built around one mood." },
  { id: "posters", label: "Posters", blurb: "A4 and A3 peel-to-paste posters. No frame, no nails." },
  { id: "framez", label: "Framez", blurb: "Wall decor for a wall that feels like you." },
  { id: "cards", label: "Cards", blurb: "Art cards and music cards to collect or gift." },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

export type Variant = {
  id: string;
  label: string;
  /** null = price not set yet; the variant shows but can't be bought. */
  pricePaise: number | null;
  /** null = not tracked (made to order). */
  stock: number | null;
  active: boolean;
  sortOrder: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: CategoryId;
  description: string;
  /** Material, size and care notes shown on the product page. */
  details: string;
  images: string[];
  tags: string[];
  active: boolean;
  featured: boolean;
  sortOrder: number;
  variants: Variant[];
  createdAt: string;
  updatedAt: string;
};

export type Fulfilment = "ship" | "pickup";
export type PaymentMethod = "upi" | "pickup";

export const ORDER_STATUSES = [
  "awaiting_payment",
  "payment_review",
  "placed",
  "paid",
  "packed",
  "shipped",
  "ready_for_pickup",
  "delivered",
  "collected",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderItem = {
  productId: string;
  variantId: string;
  name: string;
  variantLabel: string;
  image: string | null;
  unitPricePaise: number;
  qty: number;
  lineTotalPaise: number;
};

export type Address = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
};

export type Customer = {
  name: string;
  phone: string;
  email?: string;
  instagram?: string;
};

export type OrderEvent = {
  at: string;
  status: OrderStatus;
  note?: string;
  by: "customer" | "admin" | "system";
};

export type Order = {
  id: string;
  number: string;
  accessToken: string;
  status: OrderStatus;
  fulfilment: Fulfilment;
  paymentMethod: PaymentMethod;
  customer: Customer;
  address: Address | null;
  notes: string;
  items: OrderItem[];
  subtotalPaise: number;
  shippingPaise: number;
  totalPaise: number;
  utr: string | null;
  courier: string | null;
  trackingNumber: string | null;
  adminNote: string;
  events: OrderEvent[];
  createdAt: string;
  updatedAt: string;
};

export const CUSTOM_STATUSES = ["new", "quoted", "accepted", "done", "declined"] as const;
export type CustomStatus = (typeof CUSTOM_STATUSES)[number];

export type CustomRequest = {
  id: string;
  name: string;
  contact: string;
  description: string;
  cut: string;
  size: string;
  quantity: number;
  /** Storage path (Supabase) or data URL (demo mode). */
  file: string | null;
  status: CustomStatus;
  adminNote: string;
  createdAt: string;
};

export type Settings = {
  storeOpen: boolean;
  announcement: string;
  shippingEnabled: boolean;
  shippingFeePaise: number;
  /** null = no free-shipping threshold. */
  freeShippingAbovePaise: number | null;
  shipsTo: string;
  dispatchNote: string;
  pickupEnabled: boolean;
  pickupNote: string;
  upiEnabled: boolean;
  upiVpa: string;
  upiPayee: string;
  minOrderPaise: number;
};
