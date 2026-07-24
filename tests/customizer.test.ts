import { describe, it, expect } from "vitest";

describe("Customizer Engine & Math Helpers", () => {
  it("calculates DPI resolution accurately", () => {
    const calculateDpi = (imageWidth: number, targetSizeInches: number) =>
      Math.round(imageWidth / targetSizeInches);

    expect(calculateDpi(1200, 4)).toBe(300); // 300 DPI (High Resolution)
    expect(calculateDpi(400, 4)).toBe(100);  // 100 DPI (Low Resolution warning trigger)
  });

  it("computes sticker unit price with finish multiplier", () => {
    const basePrices: Record<string, number> = { "2x2": 199, "3x3": 299, "4x4": 399 };
    const finishMultipliers: Record<string, number> = {
      matte: 1.0,
      glossy: 1.1,
      holographic: 1.35,
    };

    const baseCents = basePrices["3x3"];
    const holographicPrice = Math.round(baseCents * finishMultipliers["holographic"]);

    expect(holographicPrice).toBe(404); // 299 * 1.35 = 403.65 -> 404 cents
  });

  it("parses Spotify track ID correctly from URL formats", () => {
    const parseSpotifyTrackId = (input: string): string | null => {
      const clean = input.trim();
      const matchUrl = clean.match(/track\/([a-zA-Z0-9]{22})/);
      if (matchUrl) return matchUrl[1];
      const matchUri = clean.match(/spotify:track:([a-zA-Z0-9]{22})/);
      if (matchUri) return matchUri[1];
      if (/^[a-zA-Z0-9]{22}$/.test(clean)) return clean;
      return null;
    };

    const url = "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT";
    const uri = "spotify:track:4cOdK2wGLETKBW3PvgPWqT";
    const rawId = "4cOdK2wGLETKBW3PvgPWqT";

    expect(parseSpotifyTrackId(url)).toBe("4cOdK2wGLETKBW3PvgPWqT");
    expect(parseSpotifyTrackId(uri)).toBe("4cOdK2wGLETKBW3PvgPWqT");
    expect(parseSpotifyTrackId(rawId)).toBe("4cOdK2wGLETKBW3PvgPWqT");
    expect(parseSpotifyTrackId("invalid-url")).toBeNull();
  });
});
