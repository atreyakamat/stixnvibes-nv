/**
 * Cloudinary test for the loader.
 */
import { describe, it, expect, vi } from "vitest";

describe("cloudinaryUrl", () => {
  it("builds a Cloudinary URL with transforms", async () => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "snv-demo";
    const { cloudinaryUrl } = await import("@/lib/cloudinary");
    const url = cloudinaryUrl("sticker_pack", { width: 600, height: 600, quality: "auto" });
    expect(url).toContain("https://res.cloudinary.com/snv-demo/image/upload/");
    expect(url).toContain("w_600");
    expect(url).toContain("h_600");
    expect(url).toContain("c_fill");
    expect(url).toContain("q_auto");
    delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  });

  it("omits width / height when not provided and uses default format=auto", async () => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "snv-demo";
    const { cloudinaryUrl } = await import("@/lib/cloudinary");
    const url = cloudinaryUrl("sticker_pack");
    expect(url).toContain("/q_auto,f_auto/sticker_pack");
    delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  });

  it("default export next/image loader falls back to pass-through without cloud_name", async () => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const loader = (await import("@/lib/cloudinary-loader")).default;
    const url = loader({ src: "img.jpg", width: 300, quality: 75 });
    expect(url).toContain("img.jpg");
    expect(url).toContain("w=300");
  });

  it("isCloudinaryConfigured returns boolean", async () => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "x";
    const mod = await import("@/lib/cloudinary");
    expect(typeof mod.isCloudinaryConfigured()).toBe("boolean");
    delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  });
});
