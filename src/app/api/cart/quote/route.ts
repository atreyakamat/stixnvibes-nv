import { z } from "zod";
import { handleError, json, readJson } from "@/lib/api";
import { quoteCart } from "@/lib/orders/pricing";
import { getStore } from "@/lib/store";
import { cartLinesSchema } from "@/lib/validation";

const schema = z.object({
  lines: cartLinesSchema,
  fulfilment: z.enum(["ship", "pickup"]).default("ship"),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid cart" }, 400);
  try {
    const store = getStore();
    const [products, settings] = await Promise.all([store.listProducts(), store.getSettings()]);
    const quote = quoteCart(parsed.data.lines, products, settings, parsed.data.fulfilment);
    return json({
      quote,
      options: {
        storeOpen: settings.storeOpen,
        shippingEnabled: settings.shippingEnabled,
        shipsTo: settings.shipsTo,
        pickupEnabled: settings.pickupEnabled,
        pickupNote: settings.pickupNote,
        upiEnabled: settings.upiEnabled,
        minOrderPaise: settings.minOrderPaise,
        dispatchNote: settings.dispatchNote,
      },
    });
  } catch (err) {
    return handleError(err, "cart/quote");
  }
}
