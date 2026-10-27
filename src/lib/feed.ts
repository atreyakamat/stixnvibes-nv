import type { Product } from "./types";

/** A one-paragraph description for shopping feeds: description, then details, up to 5000 characters. */
export function plainTextDescription(p: Pick<Product, "description" | "details">): string {
  return [p.description, p.details]
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 5000);
}
