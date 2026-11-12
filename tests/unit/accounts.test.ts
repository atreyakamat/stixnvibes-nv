import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "@/lib/store/memory";
import { EMPTY_ACCOUNT_DATA } from "@/lib/types";
import { accountDataSchema, accountSaveSchema, emailSchema, loginVerifySchema } from "@/lib/validation";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const SECRET = "s".repeat(40);

describe("customer tokens", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_SESSION_SECRET", SECRET);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips, and expires", async () => {
    const { customerFromToken, issueCustomerToken } = await import("@/lib/account");
    const issued = issueCustomerToken("riya@example.com", 1_000)!;
    expect(customerFromToken(issued.token, 2_000)).toBe("riya@example.com");
    expect(customerFromToken(issued.token, 1_000 + 91 * 86_400_000)).toBeNull();
    expect(customerFromToken("garbage")).toBeNull();
    expect(customerFromToken(undefined)).toBeNull();
  });

  it("can't be forged, and an admin cookie or admin app token is not a customer token", async () => {
    const { customerFromToken, issueCustomerToken } = await import("@/lib/account");
    const { encodeSession, issueAppToken } = await import("@/lib/admin/session");
    const { token } = issueCustomerToken("riya@example.com")!;
    const forged = `${Buffer.from(JSON.stringify({ email: "evil@example.com", exp: Date.now() + 60_000 })).toString("base64url")}.${token.split(".")[1]}`;
    expect(customerFromToken(forged)).toBeNull();
    expect(customerFromToken(encodeSession({ email: "a@b.com", exp: Date.now() + 60_000 }, SECRET))).toBeNull();
    expect(customerFromToken(issueAppToken("a@b.com")!.token)).toBeNull();
  });

  it("reads the bearer token or the cookie from a request", async () => {
    const { customerFromRequest, issueCustomerToken } = await import("@/lib/account");
    const { token } = issueCustomerToken("riya@example.com")!;
    expect(customerFromRequest(new Request("http://x", { headers: { authorization: `Bearer ${token}` } }))).toBe("riya@example.com");
    expect(customerFromRequest(new Request("http://x", { headers: { cookie: `a=b; snv_customer=${token}` } }))).toBe("riya@example.com");
    expect(customerFromRequest(new Request("http://x"))).toBeNull();
  });

  it("hashes a code per email, so one can't be used for another address", async () => {
    const { hashLoginCode, newLoginCode } = await import("@/lib/account");
    expect(hashLoginCode("a@b.com", "123456")).toBe(hashLoginCode("a@b.com", "123456"));
    expect(hashLoginCode("a@b.com", "123456")).not.toBe(hashLoginCode("c@d.com", "123456"));
    expect(newLoginCode()).toMatch(/^\d{6}$/);
  });
});

describe("account store", () => {
  let store: MemoryStore;
  beforeEach(() => {
    store = new MemoryStore();
  });

  it("creates, updates and deletes an account", async () => {
    expect(await store.getAccount("a@b.com")).toBeNull();
    const a = await store.saveAccount("a@b.com", "Riya", EMPTY_ACCOUNT_DATA);
    expect(a.name).toBe("Riya");
    const b = await store.saveAccount("a@b.com", "Riya K", { ...EMPTY_ACCOUNT_DATA, taste: { ...EMPTY_ACCOUNT_DATA.taste, wishlist: ["p1"] } });
    expect(b.createdAt).toBe(a.createdAt);
    expect((await store.getAccount("a@b.com"))?.data.taste.wishlist).toEqual(["p1"]);
    await store.deleteAccount("a@b.com");
    expect(await store.getAccount("a@b.com")).toBeNull();
  });

  it("accepts a code once, counts wrong guesses and locks after five", async () => {
    const soon = new Date(Date.now() + 60_000).toISOString();
    expect(await store.saveLoginCode("a@b.com", "h1", soon, 0)).toBe(true);
    expect(await store.checkLoginCode("a@b.com", "nope")).toBe("wrong");
    expect(await store.checkLoginCode("a@b.com", "h1")).toBe("ok");
    expect(await store.checkLoginCode("a@b.com", "h1")).toBe("expired");

    await store.saveLoginCode("a@b.com", "h2", soon, 0);
    for (let i = 0; i < 5; i++) expect(await store.checkLoginCode("a@b.com", "bad")).toBe("wrong");
    // Even the right code is refused now.
    expect(await store.checkLoginCode("a@b.com", "h2")).toBe("locked");
    // A fresh code starts clean.
    await store.saveLoginCode("a@b.com", "h3", soon, 0);
    expect(await store.checkLoginCode("a@b.com", "h3")).toBe("ok");
  });

  it("refuses expired codes and codes asked for too soon", async () => {
    await store.saveLoginCode("a@b.com", "h", new Date(Date.now() - 1000).toISOString(), 0);
    expect(await store.checkLoginCode("a@b.com", "h")).toBe("expired");
    const soon = new Date(Date.now() + 60_000).toISOString();
    expect(await store.saveLoginCode("x@y.com", "h", soon, 45_000)).toBe(true);
    expect(await store.saveLoginCode("x@y.com", "h2", soon, 45_000)).toBe(false);
    // The first code still stands.
    expect(await store.checkLoginCode("x@y.com", "h")).toBe("ok");
  });

  it("keeps accounts in the backup but never sign-in codes", async () => {
    await store.saveAccount("a@b.com", "Riya", EMPTY_ACCOUNT_DATA);
    await store.saveLoginCode("a@b.com", "h", new Date(Date.now() + 60_000).toISOString(), 0);
    const out = await store.exportAll();
    expect(out.accounts).toHaveLength(1);
    expect(out).not.toHaveProperty("loginCodes");
  });
});

describe("account helpers", () => {
  it("merges order links without dropping any or doubling one", async () => {
    const { mergeOrders } = await import("@/lib/account");
    const a = { number: "SNV-AAAAAA", key: "k".repeat(22) };
    const b = { number: "SNV-BBBBBB", key: "j".repeat(22) };
    expect(mergeOrders([a], [b, a]).map((o) => o.number).sort()).toEqual(["SNV-AAAAAA", "SNV-BBBBBB"]);
  });

  it("links a placed order to the signed-in customer, and does nothing for guests", async () => {
    const { linkOrderToAccount } = await import("@/lib/account");
    const store = new MemoryStore();
    await linkOrderToAccount(store, null, { number: "SNV-AAAAAA", viewKey: "k".repeat(22) });
    expect(await store.getAccount("a@b.com")).toBeNull();
    await linkOrderToAccount(store, "a@b.com", { number: "SNV-AAAAAA", viewKey: "k".repeat(22) });
    await linkOrderToAccount(store, "a@b.com", { number: "SNV-AAAAAA", viewKey: "k".repeat(22) });
    expect((await store.getAccount("a@b.com"))?.data.orders).toEqual([{ number: "SNV-AAAAAA", key: "k".repeat(22) }]);
  });
});

describe("account input", () => {
  it("lower-cases and checks emails", () => {
    expect(emailSchema.parse("  Riya@Example.COM ")).toBe("riya@example.com");
    expect(emailSchema.safeParse("nope").success).toBe(false);
    expect(emailSchema.safeParse("a@b").success).toBe(false);
  });

  it("wants exactly six digits for the code", () => {
    expect(loginVerifySchema.safeParse({ email: "a@b.com", code: "123456" }).success).toBe(true);
    expect(loginVerifySchema.safeParse({ email: "a@b.com", code: "12345" }).success).toBe(false);
    expect(loginVerifySchema.safeParse({ email: "a@b.com", code: "12345a" }).success).toBe(false);
  });

  it("caps lists and refuses bad order links", () => {
    const data = { ...EMPTY_ACCOUNT_DATA };
    expect(accountSaveSchema.safeParse({ name: "Riya", data }).success).toBe(true);
    expect(accountDataSchema.safeParse({ ...data, orders: [{ number: "nope", key: "k".repeat(22) }] }).success).toBe(false);
    expect(accountDataSchema.safeParse({ ...data, taste: { ...data.taste, wishlist: Array(101).fill("p") } }).success).toBe(false);
  });
});
