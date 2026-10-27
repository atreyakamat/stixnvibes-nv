import { json } from "@/lib/api";
import { appOrder } from "@/lib/app-api";
import { ORDER_NUMBER_RE } from "@/lib/constants";
import { youpiConfig } from "@/lib/env";
import { viewKeyMatches } from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";
import { getStoreOrNull } from "@/lib/store";

// An order as the app shows it: status, lines, totals and how to pay.
// Needs the same private key as the order page (?k=).
export async function GET(req: Request, ctx: RouteContext<"/api/app/order/[number]">) {
  if (!(await rateLimit("app-order", 120, 10 * 60_000))) return json({ error: "Too many tries. Wait a few minutes." }, 429);
  const number = (await ctx.params).number.toUpperCase();
  const key = new URL(req.url).searchParams.get("k") ?? undefined;
  const store = getStoreOrNull();
  const order = store && ORDER_NUMBER_RE.test(number) ? await store.getOrder(number).catch(() => null) : null;
  // Same answer for a wrong key and a missing order.
  if (!store || !order || !viewKeyMatches(order, key)) return json({ error: "Order not found." }, 404);
  const settings = await store.getSettings();
  return json({ order: appOrder(order, key!, settings, youpiConfig() !== null) });
}
