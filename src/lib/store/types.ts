import type {
  CustomRequest,
  CustomStatus,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  Settings,
} from "@/lib/types";

export type NewOrder = Omit<Order, "id" | "createdAt" | "updatedAt">;

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt" | "variants"> & {
  variants: (Omit<Product["variants"][number], "id"> & { id?: string })[];
};

export type OrderPatch = Partial<Pick<Order, "status" | "utr" | "courier" | "trackingNumber" | "adminNote">> & {
  event?: Order["events"][number];
};

export type OrderFilter = { status?: OrderStatus; search?: string; limit?: number };

export class OutOfStockError extends Error {
  constructor(public variantId: string) {
    super("Out of stock");
  }
}

/**
 * Everything the app needs from persistence. Two implementations: Supabase
 * for real use and an in-memory store for local dev, tests and previews.
 */
export interface Store {
  readonly mode: "supabase" | "demo";

  listProducts(opts?: { includeInactive?: boolean }): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product | null>;
  getProduct(id: string): Promise<Product | null>;
  createProduct(input: ProductInput): Promise<Product>;
  updateProduct(id: string, input: ProductInput): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  /** Stores an image and returns its public URL. */
  uploadProductImage(file: File): Promise<string>;

  /** Inserts the order and takes stock in one step; throws OutOfStockError. */
  placeOrder(order: NewOrder): Promise<Order>;
  getOrderByNumber(number: string): Promise<Order | null>;
  listOrders(filter?: OrderFilter): Promise<Order[]>;
  updateOrder(number: string, patch: OrderPatch): Promise<Order>;
  /** Puts an order's stock back (on cancel). */
  restock(items: OrderItem[]): Promise<void>;

  createCustomRequest(input: Omit<CustomRequest, "id" | "createdAt" | "status" | "adminNote" | "file">, file: File | null): Promise<CustomRequest>;
  listCustomRequests(): Promise<CustomRequest[]>;
  updateCustomRequest(id: string, patch: { status?: CustomStatus; adminNote?: string }): Promise<void>;
  /** A short-lived link to view an uploaded design. */
  customFileUrl(file: string): Promise<string | null>;

  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;
}
