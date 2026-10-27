import type { BlogPost, College, Collection, Coupon, CustomRequest, CustomStatus, EventType, GalleryItem, Offer, Order, OrderStatus, Product, Settings, Stall, StallSale, Stats, Upload } from "@/lib/types";

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt">;
export type CollectionInput = Omit<Collection, "id" | "createdAt">;
export type OfferInput = Omit<Offer, "id">;
export type NewOrder = Omit<Order, "id" | "createdAt" | "updatedAt" | "status" | "adminNote" | "stockTaken" | "trackingNumber">;
export type OrderPatch = Partial<Pick<Order, "status" | "adminNote" | "trackingNumber">>;
export type OrderFilter = {
  status?: OrderStatus;
  /** Matches order number, customer name or phone. */
  search?: string;
  limit?: number;
  /** Only orders changed after this ISO time (for the InWoice sync). */
  updatedSince?: string;
  /** Only orders placed at or after this ISO time (for profit reports). */
  createdSince?: string;
};
export type TrackEvent = { type: EventType; productId: string | null; path: string; source?: string };
export type CouponInput = Omit<Coupon, "createdAt">;
export type NewCustomRequest = Omit<CustomRequest, "id" | "createdAt" | "updatedAt" | "status" | "adminNote">;
export type CustomRequestPatch = Partial<{ status: CustomStatus; adminNote: string }>;
export type StallInput = Omit<Stall, "id" | "createdAt">;
export type NewStallSale = Omit<StallSale, "createdAt">;
export type StallSaleFilter = { stallId?: string; since?: string; limit?: number };
export type PostInput = Omit<BlogPost, "id" | "createdAt" | "updatedAt">;
export type GalleryInput = Omit<GalleryItem, "id" | "createdAt">;
export type CollegeInput = Omit<College, "id" | "createdAt">;

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
  /**
   * Takes (sign -1) or returns (+1) the order's items from stock, exactly
   * once each way: flips stockTaken first and does nothing if it was
   * already in that state. Products without a stock count are skipped.
   */
  moveStock(number: string, sign: -1 | 1): Promise<void>;

  listCoupons(): Promise<Coupon[]>;
  getCoupon(code: string): Promise<Coupon | null>;
  saveCoupon(input: CouponInput, isNew: boolean): Promise<Coupon>;
  deleteCoupon(code: string): Promise<void>;
  /** Orders with this code that weren't cancelled. */
  couponUses(code: string): Promise<number>;

  createCustomRequest(input: NewCustomRequest): Promise<CustomRequest>;
  getCustomRequest(number: string): Promise<CustomRequest | null>;
  listCustomRequests(limit?: number): Promise<CustomRequest[]>;
  updateCustomRequest(number: string, patch: CustomRequestPatch): Promise<CustomRequest>;

  /** A customer photo for a custom product (music card, etc.). */
  saveUpload(id: string, file: File): Promise<Upload>;
  /** A link the admin can open, or the file itself in demo mode. */
  readUpload(id: string): Promise<{ url: string } | { body: Buffer; contentType: string } | null>;

  track(events: TrackEvent[]): Promise<void>;
  stats(sinceIso: string): Promise<Stats>;

  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;

  listStalls(): Promise<Stall[]>;
  getStall(id: string): Promise<Stall | null>;
  saveStall(id: string | null, input: StallInput): Promise<Stall>;
  deleteStall(id: string): Promise<void>;

  /**
   * Stores a sale from stall mode and takes its items off stock. The same
   * id sent twice is stored once: created is false the second time.
   */
  recordStallSale(sale: NewStallSale): Promise<{ sale: StallSale; created: boolean }>;
  listStallSales(filter?: StallSaleFilter): Promise<StallSale[]>;
  /** Deletes a sale (rung up by mistake) and puts its items back in stock. */
  voidStallSale(id: string): Promise<void>;

  listPosts(opts?: { includeDrafts?: boolean }): Promise<BlogPost[]>;
  getPost(id: string): Promise<BlogPost | null>;
  savePost(id: string | null, input: PostInput): Promise<BlogPost>;
  deletePost(id: string): Promise<void>;

  listGallery(opts?: { includeHidden?: boolean }): Promise<GalleryItem[]>;
  saveGalleryItem(id: string | null, input: GalleryInput): Promise<GalleryItem>;
  deleteGalleryItem(id: string): Promise<void>;

  listColleges(opts?: { includeHidden?: boolean }): Promise<College[]>;
  getCollege(id: string): Promise<College | null>;
  saveCollege(id: string | null, input: CollegeInput): Promise<College>;
  deleteCollege(id: string): Promise<void>;

  /** Every table except analytics events, for the home lab backup. */
  exportAll(): Promise<Record<string, unknown>>;
}
