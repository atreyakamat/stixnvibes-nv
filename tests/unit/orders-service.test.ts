import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "@/lib/store/memory";
import { DEMO_SETTINGS, demoProducts } from "@/lib/store/seed";

vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));

const g = globalThis as unknown as { __snvStore?: MemoryStore };

async function service() {
  return import("@/lib/orders/service");
}

const products = demoProducts();
products[0].variants[0].stock = 3;
const stickerLine = { productId: products[0].id, variantId: products[0].variants[0].id, qty: 2 };

const checkout = (over: Record<string, unknown> = {}) => ({
  lines: [stickerLine],
  fulfilment: "ship" as const,
  paymentMethod: "upi" as const,
  customer: { name: "Asha", phone: "9876543210", email: "", instagram: "@asha" },
  address: { line1: "House 1", line2: "", city: "Panaji", state: "Goa", pincode: "403001" },
  notes: "",
  ...over,
});

beforeEach(() => {
  g.__snvStore = new MemoryStore({ products: structuredClone(products), settings: { ...DEMO_SETTINGS } });
});

describe("createOrder", () => {
  it("creates an order with server prices and takes stock", async () => {
    const { createOrder } = await service();
    const order = await createOrder(checkout());
    expect(order.number).toMatch(/^SNV-[A-Z2-9]{6}$/);
    expect(order.status).toBe("awaiting_payment");
    expect(order.totalPaise).toBe(2 * 4900 + DEMO_SETTINGS.shippingFeePaise);
    expect(order.customer.instagram).toBe("asha");
    const p = await g.__snvStore!.getProduct(products[0].id);
    expect(p!.variants[0].stock).toBe(1);
  });

  it("refuses to oversell", async () => {
    const { createOrder, CheckoutError } = await service();
    await createOrder(checkout());
    await expect(createOrder(checkout())).rejects.toBeInstanceOf(CheckoutError);
  });

  it("refuses orders while the shop is closed", async () => {
    await g.__snvStore!.saveSettings({ ...DEMO_SETTINGS, storeOpen: false });
    const { createOrder } = await service();
    await expect(createOrder(checkout())).rejects.toThrow(/aren't open/);
  });

  it("refuses a payment method that is switched off", async () => {
    await g.__snvStore!.saveSettings({ ...DEMO_SETTINGS, pickupEnabled: false });
    const { createOrder } = await service();
    await expect(createOrder(checkout({ fulfilment: "pickup", paymentMethod: "pickup", address: null }))).rejects.toThrow(/Pickup/);
  });
});

describe("payment and status flow", () => {
  it("accepts a UTR only with the right token, once per UTR", async () => {
    const { createOrder, submitUtr } = await service();
    const a = await createOrder(checkout({ lines: [{ ...stickerLine, qty: 1 }] }));
    const b = await createOrder(checkout({ lines: [{ ...stickerLine, qty: 1 }] }));
    await expect(submitUtr(a.number, "x".repeat(24), "412345678901")).rejects.toThrow(/not found/);
    await expect(submitUtr(a.number, a.accessToken, "123")).rejects.toThrow(/12 digits/);
    const reviewed = await submitUtr(a.number, a.accessToken, "4123 4567 8901");
    expect(reviewed.status).toBe("payment_review");
    expect(reviewed.utr).toBe("412345678901");
    await expect(submitUtr(b.number, b.accessToken, "412345678901")).rejects.toThrow(/already used/);
  });

  it("walks an order through to delivered and logs each step", async () => {
    const { createOrder, transitionOrder } = await service();
    const o = await createOrder(checkout());
    await transitionOrder(o.number, "paid");
    await transitionOrder(o.number, "packed");
    await expect(transitionOrder(o.number, "ready_for_pickup")).rejects.toThrow();
    await transitionOrder(o.number, "shipped", "India Post");
    const done = await transitionOrder(o.number, "delivered");
    expect(done.events.map((e) => e.status)).toEqual(["awaiting_payment", "paid", "packed", "shipped", "delivered"]);
    expect(done.events[3].note).toBe("India Post");
  });

  it("puts stock back on cancel and clears a rejected UTR", async () => {
    const { createOrder, submitUtr, transitionOrder } = await service();
    const o = await createOrder(checkout());
    await submitUtr(o.number, o.accessToken, "412345678901");
    const rejected = await transitionOrder(o.number, "awaiting_payment");
    expect(rejected.utr).toBeNull();
    await transitionOrder(o.number, "cancelled");
    const p = await g.__snvStore!.getProduct(products[0].id);
    expect(p!.variants[0].stock).toBe(3);
  });

  it("finds orders for tracking only with the matching phone", async () => {
    const { createOrder, findOrderForCustomer } = await service();
    const o = await createOrder(checkout());
    expect(await findOrderForCustomer(o.number, "9876543210")).not.toBeNull();
    expect(await findOrderForCustomer(o.number, "9000000000")).toBeNull();
  });
});
