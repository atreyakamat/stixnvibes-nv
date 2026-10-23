export const MAX_QTY_PER_LINE = 99;
export const MAX_LINES = 60;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const UPLOAD_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const ORDER_NUMBER_RE = /^SNV-[A-Z0-9]{6}$/;
export const UPLOAD_ID_RE = /^[a-z0-9]{20,40}$/;
