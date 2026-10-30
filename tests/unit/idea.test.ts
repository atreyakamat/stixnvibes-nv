import { describe, expect, it } from "vitest";
import { checkIdea, cleanSeed, ideaImageUrl } from "@/lib/idea";

describe("AI sticker ideas", () => {
  it("accepts a plain idea and tidies spaces", () => {
    expect(checkIdea("  a cat   drinking chai ")).toEqual({ ok: true, idea: "a cat drinking chai" });
  });

  it("rejects empty, long, link and non-string ideas", () => {
    expect(checkIdea("hi").ok).toBe(false);
    expect(checkIdea("x".repeat(201)).ok).toBe(false);
    expect(checkIdea("see https://example.com").ok).toBe(false);
    expect(checkIdea(42).ok).toBe(false);
  });

  it("blocks brands and characters as whole words only", () => {
    expect(checkIdea("Pikachu on a scooter").ok).toBe(false);
    expect(checkIdea("goa beach with NIKE shoes").ok).toBe(false);
    expect(checkIdea("spider-man in panjim").ok).toBe(false);
    expect(checkIdea("a spider in a mango tree").ok).toBe(true);
    expect(checkIdea("pumas and jaguars").ok).toBe(true);
  });

  it("builds a fixed Pollinations URL the client can't redirect", () => {
    const url = new URL(ideaImageUrl("a cat drinking chai", "sticker", 7));
    expect(url.origin).toBe("https://image.pollinations.ai");
    expect(decodeURIComponent(url.pathname)).toContain("die-cut vinyl sticker of a cat drinking chai");
    expect(url.searchParams.get("seed")).toBe("7");
    expect(url.searchParams.get("safe")).toBe("true");
    expect(new URL(ideaImageUrl("x/../../evil?y=1#z", "poster", 1)).origin).toBe("https://image.pollinations.ai");
    expect(new URL(ideaImageUrl("x/../../evil?y=1#z", "poster", 1)).pathname.startsWith("/prompt/")).toBe(true);
  });

  it("keeps valid seeds and replaces bad ones", () => {
    expect(cleanSeed(5)).toBe(5);
    for (const bad of [-1, 1.5, "3", null, 2e9]) {
      const s = cleanSeed(bad);
      expect(Number.isInteger(s) && s >= 0 && s < 1e9).toBe(true);
    }
  });
});
