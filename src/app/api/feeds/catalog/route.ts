import { site } from "@/content/site";
import { canOrder, fromPrice, isSoldOut } from "@/lib/pricing";
import { getShopState } from "@/lib/shop";
import { plainTextDescription } from "@/lib/feed";
import { typeLabel } from "@/lib/types";

// Product catalogue for Meta Commerce Manager (Instagram and Facebook
// shopping). Add it as a scheduled data feed:
//   https://shop.stixnvibes.com/api/feeds/catalog  (CSV, daily)
// Each live, priced product is one item at its lowest price; options are
// picked on the product page the item links to.

export const revalidate = 3600;

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET() {
  const { products } = await getShopState();
  const head = ["id", "title", "description", "availability", "condition", "price", "link", "image_link", "additional_image_link", "brand", "product_type", "inventory"];
  const rows = products
    .filter((p) => p.status === "live" && p.pricePaise !== null && p.images[0] && !p.images[0].startsWith("data:"))
    .map((p) => {
      const price = fromPrice(p) ?? p.pricePaise!;
      const abs = (src: string) => new URL(src, site.url).toString();
      return [
        p.id,
        p.name.slice(0, 150),
        plainTextDescription(p) || p.name,
        canOrder(p) ? "in stock" : isSoldOut(p) ? "out of stock" : "available for order",
        "new",
        `${(price / 100).toFixed(2)} INR`,
        `${site.url}/shop/${p.slug}?src=instagram-shop`,
        abs(p.images[0]),
        p.images
          .slice(1, 6)
          .filter((x) => !x.startsWith("data:"))
          .map(abs)
          .join(","),
        site.name,
        typeLabel(p.type),
        p.stock ?? "",
      ];
    });
  const csv = [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'inline; filename="stixnvibes-catalog.csv"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
