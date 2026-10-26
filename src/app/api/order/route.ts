import { handleError, json, readJson } from "@/lib/api";
import { notifyNewOrder } from "@/lib/notify";
import { createOrder, orderPath } from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";
import { getStoreOrNull } from "@/lib/store";
import { orderSchema } from "@/lib/validation";

export async function POST(req: Request) {
  if (!(await rateLimit("order", 20, 10 * 60_000))) return json({ error: "Too many orders in a short time. Message us on Instagram." }, 429);
  const parsed = orderSchema.safeParse(await readJson(req));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Check your cart." }, 400);
  if (parsed.data.company) return json({ error: "Invalid request." }, 400);
  try {
    const { order } = await createOrder(parsed.data);
    await getStoreOrNull()?.track([{ type: "order_click", productId: null, path: "/cart", source: order.source }]).catch(() => {});
    await notifyNewOrder(order);
    return json({ number: order.number, totalPaise: order.totalPaise, orderPath: orderPath(order) });
  } catch (err) {
    return handleError(err, "order");
  }
}
