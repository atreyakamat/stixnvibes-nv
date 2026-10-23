import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const SECRET = "a".repeat(40);

describe("admin session cookie", () => {
  it("round-trips a signed session", async () => {
    const { decodeSession, encodeSession } = await import("@/lib/admin/session");
    const value = encodeSession({ email: "atreya@example.com", exp: Date.now() + 60_000 }, SECRET);
    expect(decodeSession(value, SECRET)?.email).toBe("atreya@example.com");
  });

  it("rejects tampered, re-signed or expired sessions", async () => {
    const { decodeSession, encodeSession } = await import("@/lib/admin/session");
    const value = encodeSession({ email: "a@b.com", exp: Date.now() + 60_000 }, SECRET);
    const [, mac] = value.split(".");
    const forged = `${Buffer.from(JSON.stringify({ email: "evil@b.com", exp: Date.now() + 60_000 })).toString("base64url")}.${mac}`;
    expect(decodeSession(forged, SECRET)).toBeNull();
    expect(decodeSession(value, "b".repeat(40))).toBeNull();
    expect(decodeSession(encodeSession({ email: "a@b.com", exp: Date.now() - 1 }, SECRET), SECRET)).toBeNull();
    expect(decodeSession("garbage", SECRET)).toBeNull();
  });
});
