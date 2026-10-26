import type { Metadata } from "next";
import { SheetMaker, type SheetDesign } from "@/components/admin/sheet-maker";
import { requireAdmin } from "@/lib/admin/session";
import { CUSTOM_NUMBER_RE, ORDER_NUMBER_RE } from "@/lib/constants";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Cricut sheets" };

/** Print Then Cut sheets from shop designs, an order, a custom request or local files. */
export default async function SheetsPage({ searchParams }: PageProps<"/admin/sheets">) {
  await requireAdmin();
  const sp = await searchParams;
  const store = getStore();
  const products = await store.listProducts({ includeHidden: true });
  const image = new Map(products.map((p) => [p.id, p.images[0] ?? ""]));

  let initial: SheetDesign[] = [];
  let title = "stixnvibes";
  const order = typeof sp.order === "string" && ORDER_NUMBER_RE.test(sp.order) ? await store.getOrder(sp.order) : null;
  const custom = typeof sp.custom === "string" && CUSTOM_NUMBER_RE.test(sp.custom) ? await store.getCustomRequest(sp.custom) : null;
  if (order) {
    title = order.number;
    // Stickers and sheets print from their design. Each line keeps its own row so quantities stay per option.
    initial = order.lines
      .filter((l) => l.type === "sticker" || l.type === "sheet")
      .map((l) => ({ name: `${l.name}${l.options.length ? ` (${l.options.join(", ")})` : ""}`, src: image.get(l.productId) || l.image || "", qty: l.qty }))
      .filter((d) => d.src);
  } else if (custom) {
    title = custom.number;
    initial = custom.files.map((id, i) => ({ name: `Design ${i + 1}`, src: `/u/${id}`, qty: custom.files.length === 1 ? Math.min(custom.qty, 999) : 1 }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-5xl">Cricut sheets</h1>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          Pick designs and how many of each. The sheet maker lays them out with a white cut border, splits them across as many sheets as needed, and gives you
          transparent PNGs ready for Print Then Cut.
          {order && ` Loaded the stickers from order ${order.number}.`}
          {custom && ` Loaded the designs from ${custom.number} (${custom.qty} wanted in total).`}
        </p>
      </div>
      <SheetMaker
        products={products.filter((p) => p.images[0] && (p.type === "sticker" || p.type === "sheet")).map((p) => ({ id: p.id, name: p.name, image: p.images[0] }))}
        initial={initial}
        title={title}
      />
    </div>
  );
}
