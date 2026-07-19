/**
 * Cloudinary client — server-side uses API key/secret for signed uploads.
 * Client-side uses unsigned upload preset (configured in Cloudinary dashboard).
 */

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";

export function isCloudinaryConfigured() {
  return Boolean(cloudName);
}

export function cloudinaryUrl(publicId: string, opts: {
  width?: number;
  height?: number;
  quality?: "auto" | number;
  format?: "auto" | "webp" | "jpg" | "png";
  gravity?: string;
} = {}) {
  const { width, height, quality = "auto", format = "auto", gravity = "auto" } = opts;
  const transforms: string[] = [];
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) transforms.push(`c_fill`, `g_${gravity}`);
  transforms.push(`q_${quality}`, `f_${format}`);
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms.join(",")}/${publicId}`;
}

export const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "stixnvibes_uploads";
export const CLOUD_NAME = cloudName;
