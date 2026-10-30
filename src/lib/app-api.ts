import "server-only";
import { site } from "@/content/site";
import { awaitingPayment, totalIsFinal } from "@/lib/orders";
import { formatINR } from "@/lib/money";
import type { BlogPost, College, Collection, GalleryItem, Offer, Order, Product, Settings, Stall } from "@/lib/types";
import { upiLink } from "@/lib/upi";

// What the Stix N Vibes Android app reads. Everything here is already public
// on the website; costs, goals, admin notes and order secrets never leave
// the server. Bump APP_API_VERSION when a field changes meaning.

export const APP_API_VERSION = 1;

/** Root-relative paths become full links; the app has no page origin. */
export const absolute = (src: string) => (src.startsWith("/") ? new URL(src, site.url).toString() : src);

export type AppProduct = Omit<Product, "costPaise" | "lowStockAt" | "createdAt" | "updatedAt">;

export function appProduct(p: Product): AppProduct {
  const { costPaise: _c, lowStockAt: _l, createdAt: _a, updatedAt: _u, ...rest } = p;
  return { ...rest, images: p.images.map(absolute) };
}

export type AppSettings = Pick<
  Settings,
  "storeOpen" | "announcement" | "instagramHandle" | "orderNote" | "deliveryNote" | "bulkNote" | "freeShippingAbovePaise" | "mrpMarkupPercent"
>;

export function appSettings(s: Settings): AppSettings {
  const { storeOpen, announcement, instagramHandle, orderNote, deliveryNote, bulkNote, freeShippingAbovePaise, mrpMarkupPercent } = s;
  return { storeOpen, announcement, instagramHandle, orderNote, deliveryNote, bulkNote, freeShippingAbovePaise, mrpMarkupPercent };
}

export const appCollection = (c: Collection) => ({ ...c, image: c.image ? absolute(c.image) : "" });
export const appCollege = (c: College) => ({ ...c, image: c.image ? absolute(c.image) : "" });
export const appPost = (p: BlogPost) => ({ ...p, cover: p.cover ? absolute(p.cover) : "" });
export const appGalleryItem = (g: GalleryItem) => ({ ...g, image: absolute(g.image) });

export type AppCatalog = {
  version: number;
  updatedAt: string;
  shopUrl: string;
  /** Live and upcoming products; hidden ones stay admin only. */
  products: AppProduct[];
  collections: ReturnType<typeof appCollection>[];
  /** Offers running right now. */
  offers: Offer[];
  settings: AppSettings;
  colleges: ReturnType<typeof appCollege>[];
  /** Public stalls from today on: name, date, venue and college only. */
  stalls: Pick<Stall, "id" | "name" | "date" | "venue" | "collegeId">[];
  posts: ReturnType<typeof appPost>[];
  gallery: ReturnType<typeof appGalleryItem>[];
};

export function appCatalog(input: {
  products: Product[];
  collections: Collection[];
  offers: Offer[];
  settings: Settings;
  colleges: College[];
  stalls: AppCatalog["stalls"];
  posts: BlogPost[];
  gallery: GalleryItem[];
  now?: Date;
}): AppCatalog {
  return {
    version: APP_API_VERSION,
    updatedAt: (input.now ?? new Date()).toISOString(),
    shopUrl: site.url,
    products: input.products.filter((p) => p.status !== "hidden").map(appProduct),
    collections: input.collections.filter((c) => c.active).map(appCollection),
    offers: input.offers.filter((o) => o.active),
    settings: appSettings(input.settings),
    colleges: input.colleges.filter((c) => c.active).map(appCollege),
    stalls: input.stalls,
    posts: input.posts.filter((p) => p.status === "published").map(appPost),
    gallery: input.gallery.filter((g) => g.visible).map(appGalleryItem),
  };
}

export type AppOrder = Omit<Order, "id" | "viewKey" | "adminNote" | "stockTaken"> & {
  /** How the customer pays, or null once nothing is owed. */
  pay: {
    amount: string;
    /** False while the delivery charge is still to be agreed. */
    amountFixed: boolean;
    /** upi://pay link that opens GPay, PhonePe, Paytm... */
    upiLink: string | null;
    upiId: string;
    /** True when the online gateway can take this payment (POST /api/pay). */
    online: boolean;
    whatsapp: string | null;
  } | null;
  receiptUrl: string;
  orderUrl: string;
};

export function appOrder(order: Order, key: string, settings: Settings, gatewayOn: boolean): AppOrder {
  const { id: _i, viewKey: _v, adminNote: _a, stockTaken: _s, ...rest } = order;
  const unpaid = awaitingPayment(order);
  const amountFixed = totalIsFinal(order, settings.freeShippingAbovePaise);
  const k = encodeURIComponent(key);
  return {
    ...rest,
    lines: order.lines.map((l) => ({ ...l, image: l.image ? absolute(l.image) : null })),
    pay: unpaid
      ? {
          amount: formatINR(order.totalPaise),
          amountFixed,
          upiLink: settings.upiId
            ? upiLink({ upiId: settings.upiId, name: settings.upiName || site.name, amountPaise: amountFixed ? order.totalPaise : null, note: `${site.name} ${order.number}` })
            : null,
          upiId: settings.upiId,
          online: gatewayOn && amountFixed,
          whatsapp: settings.whatsappNumber
            ? `https://wa.me/91${settings.whatsappNumber}?text=${encodeURIComponent(`Hi! I paid for order ${order.number} (${formatINR(order.totalPaise)}). Screenshot attached.`)}`
            : null,
        }
      : null,
    receiptUrl: `${site.url}/receipt/${order.number}?k=${k}`,
    orderUrl: `${site.url}/order/${order.number}?k=${k}`,
  };
}
