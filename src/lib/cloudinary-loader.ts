import type { ImageLoader } from "next/image";

/**
 * Cloudinary loader for next/image.
 * Once NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is set, images using
 * <Image src="my-public-id" loader={cloudinaryLoader} /> will be served
 * via Cloudinary's transformation pipeline.
 *
 * To enable app-wide, add to next.config.mjs:
 *   images: { loader: "custom", loaderFile: "./src/lib/cloudinary-loader.ts" }
 */

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";

const cloudinaryLoader: ImageLoader = ({ src, width, quality }) => {
  if (!cloudName) {
    // Fallback for dev without Cloudinary — pass through src.
    return `${src.includes("?") ? src : `${src}?w=${width}`}`;
  }
  const params = [
    "f_auto",
    "q_auto",
    `w_${width}`,
    `q_${quality ?? "auto"}`,
  ].join(",");
  // If src already includes cloud_name, don't re-prepend.
  if (src.startsWith(`https://res.cloudinary.com/${cloudName}/`)) {
    return src;
  }
  return `https://res.cloudinary.com/${cloudName}/image/upload/${params}/${src.replace(/^\//, "")}`;
};

export default cloudinaryLoader;
