import { site } from "@/content/site";

/**
 * The link a stall QR opens: the shop home with the source to count and,
 * optionally, a code the cart applies by itself.
 */
export function qrLink(source: string, code?: string) {
  const q = new URLSearchParams({ src: source });
  if (code) q.set("code", code);
  return `${site.url}/?${q}`;
}
