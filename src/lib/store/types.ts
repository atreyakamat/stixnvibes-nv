import type { Collection, EventType, Offer, Order, OrderStatus, Product, Settings, Stats, Upload } from "@/lib/types";

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt">;
export type CollectionInput = Omit<Collection, "id" | "createdAt">;
export type OfferInput = Omit<Offer, "id">;
export type NewOrder = Omit<Order, "id" | "createdAt" | "updatedAt" | "status" | "adminNote">;
export type OrderPatch = Partial<Pick<Order, "status" | "adminNote">>;
export type OrderFilter = { status?: OrderStatus; search?: string; limit?: number };
export type TrackEvent = { type: EventType; productId: string | null; path: string };

/**
 * Everything the app needs from persistence. Two implementations: Supabase
 * for real use and an in-memory store for local dev, tests and previews.
 */
export interface Store {
  readonly mode: "supabase" | "demo";

  listProducts(opts?: { includeHidden?: boolean }): Promise<Product[]>;
  getProduct(id: string): Promise<Product | null>;
  createProduct(input: ProductInput): Promise<Product>;
  updateProduct(id: string, input: ProductInput): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  /** Stores a product photo and returns its public URL. */
  uploadProductImage(file: File): Promise<string>;

  listCollections(opts?: { includeHidden?: boolean }): Promise<Collection[]>;
  getCollection(id: string): Promise<Collection | null>;
  createCollection(input: CollectionInput): Promise<Collection>;
  updateCollection(id: string, input: CollectionInput): Promise<Collection>;
  deleteCollection(id: string): Promise<void>;

  listOffers(opts?: { includeInactive?: boolean }): Promise<Offer[]>;
  saveOffer(id: string | null, input: OfferInput): Promise<Offer>;
  deleteOffer(id: string): Promise<void>;

  createOrder(order: NewOrder): Promise<Order>;
  getOrder(number: string): Promise<Order | null>;
  listOrders(filter?: OrderFilter): Promise<Order[]>;
  updateOrder(number: string, patch: OrderPatch): Promise<Order>;

  /** A customer photo for a custom product (music card, etc.). */
  saveUpload(id: string, file: File): Promise<Upload>;
  /** A link the admin can open, or the file itself in demo mode. */
  readUpload(id: string): Promise<{ url: string } | { body: Buffer; contentType: string } | null>;

  track(events: TrackEvent[]): Promise<void>;
  stats(sinceIso: string): Promise<Stats>;

  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;
}
