/**
 * Unit tests for utility functions.
 */
import { describe, it, expect } from "vitest";
import { cn, formatPrice, slugify, truncate, formatDate } from "@/lib/utils";

describe("cn", () => {
  it("merges tailwind classes", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });
  it("resolves conflicting tailwind classes (last wins)", () => {
    expect(cn("h-10", "h-12")).toBe("h-12");
  });
  it("handles conditional args", () => {
    expect(cn("a", false, undefined, "c")).toBe("a c");
  });
});

describe("formatPrice", () => {
  it("formats amount in INR with no decimals", () => {
    expect(formatPrice(199)).toBe("₹199");
  });
  it("groups thousands", () => {
    expect(formatPrice(1500)).toBe("₹1,500");
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Anime Heroes!")).toBe("anime-heroes");
  });
  it("strips non-alphanumeric", () => {
    expect(slugify("F1 Speed *Sticker*")).toBe("f1-speed-sticker");
  });
});

describe("truncate", () => {
  it("returns string untouched when under max", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });
  it("truncates with ellipsis", () => {
    const out = truncate("hello world", 5);
    expect(out).toHaveLength(5);
    expect(out.endsWith("\u2026")).toBe(true);
  });
});

describe("formatDate", () => {
  it("formats ISO date", () => {
    const out = formatDate("2026-07-21");
    expect(out).toMatch(/Jul/i);
    expect(out).toContain("2026");
  });
});
