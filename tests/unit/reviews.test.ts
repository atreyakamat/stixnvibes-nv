import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "@/lib/store/memory";
import { demoProducts } from "@/lib/store/seed";
import type { NewReview } from "@/lib/store/types";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const input = (over: Partial<NewReview> = {}): NewReview => ({
  productId: demoProducts()[0].id,
  orderNumber: null,
  name: "Riya",
  instagram: "",
  rating: 5,
  text: "Lovely",
  photos: [],
  ...over,
});

describe("review store", () => {
  let store: MemoryStore;
  beforeEach(() => {
    store = new MemoryStore({ products: demoProducts() });
  });

  it("saves new reviews as pending and filters by status and product", async () => {
    const a = await store.createReview(input());
    const b = await store.createReview(input({ productId: demoProducts()[1].id }));
    expect(a.status).toBe("pending");
    expect((await store.listReviews({ status: "pending" })).map((r) => r.id).sort()).toEqual([a.id, b.id].sort());
    expect(await store.listReviews({ productId: a.productId })).toHaveLength(1);
    expect(await store.listReviews({ status: "published" })).toEqual([]);
  });

  it("allows one review per product per verified order", async () => {
    await store.createReview(input({ orderNumber: "SNV-ABC123" }));
    await expect(store.createReview(input({ orderNumber: "SNV-ABC123" }))).rejects.toThrow(/already has a review/);
    await expect(store.createReview(input({ orderNumber: "SNV-ABC123", productId: demoProducts()[1].id }))).resolves.toBeTruthy();
  });

  it("stamps repliedAt when the reply changes and clears it when the reply is removed", async () => {
    const r = await store.createReview(input());
    const replied = await store.updateReview(r.id, { reply: "Thanks!", status: "published" });
    expect(replied).toMatchObject({ reply: "Thanks!", status: "published" });
    expect(replied.repliedAt).not.toBeNull();
    const same = await store.updateReview(r.id, { reply: "Thanks!" });
    expect(same.repliedAt).toBe(replied.repliedAt);
    expect((await store.updateReview(r.id, { reply: "" })).repliedAt).toBeNull();
  });

  it("drops a product's reviews with the product and includes reviews in the backup", async () => {
    const r = await store.createReview(input());
    expect(Object.keys(await store.exportAll())).toContain("reviews");
    await store.deleteProduct(r.productId);
    expect(await store.getReview(r.id)).toBeNull();
  });
});

describe("review admin ops", () => {
  it("validates, publishes, replies and deletes", async () => {
    vi.stubEnv("SHOP_DEMO_MODE", "true");
    const { getStore } = await import("@/lib/store");
    const { moderateReview, removeReview } = await import("@/lib/admin/reviews");
    const store = getStore();
    const r = await store.createReview(input());
    expect(await moderateReview(r.id, {})).toEqual({ ok: false, error: "Nothing to change." });
    expect(await moderateReview(r.id, { status: "live" })).toMatchObject({ ok: false });
    expect(await moderateReview("missing", { status: "published" })).toEqual({ ok: false, error: "Review not found." });
    expect(await moderateReview(r.id, { status: "published", reply: "  Thanks!  " })).toEqual({ ok: true, message: "Published." });
    expect(await store.getReview(r.id)).toMatchObject({ status: "published", reply: "Thanks!" });
    expect(await moderateReview(r.id, { reply: "x".repeat(1001) })).toMatchObject({ ok: false });
    expect(await removeReview(r.id)).toMatchObject({ ok: true });
    expect(await store.getReview(r.id)).toBeNull();
  });
});
