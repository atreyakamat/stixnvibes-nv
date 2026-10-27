import { site } from "@/content/site";

/**
 * The link a stall QR opens: a shop page (home unless a path is given, e.g.
 * a college page) with the source to count and, optionally, a code the cart
 * applies by itself.
 */
export function qrLink(source: string, code?: string, path = "/") {
  const q = new URLSearchParams({ src: source });
  if (code) q.set("code", code);
  const safePath = /^\/[a-z0-9/-]*$/.test(path) ? path : "/";
  return `${site.url}${safePath}?${q}`;
}
