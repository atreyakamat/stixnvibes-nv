import { handleError, json, readJson } from "@/lib/api";
import { createOrder, orderPath } from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";
import { getStoreOrNull } from "@/lib/store";
import { orderSchema } from "@/lib/validation";

export async function POST(req: Request) {
  if (!(await rateLimit("order", 20, 10 * 60_000))) return json({ error: "Too many orders in a short time. Message us on WhatsApp." }, 429);
  const parsed = orderSchema.safeParse(await readJson(req));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Check your cart." }, 400);
  if (parsed.data.company) return json({ error: "Invalid request." }, 400);
  try {
    const { order, whatsappUrl } = await createOrder(parsed.data);
    await getStoreOrNull()?.track([{ type: "order_click", productId: null, path: "/cart" }]).catch(() => {});
    return json({ number: order.number, totalPaise: order.totalPaise, whatsappUrl, orderPath: orderPath(order) });
  } catch (err) {
    return handleError(err, "order");
  }
}
