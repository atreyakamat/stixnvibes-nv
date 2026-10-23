// Plain constants shared by client and server (no zod, keeps client bundles small).
export const CUSTOM_CUTS = ["Die cut", "Kiss cut", "Circle", "Square", "Not sure"] as const;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const UPLOAD_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
export const MAX_QTY_PER_LINE = 50;
