import { handleError, json, readJson } from "@/lib/api";
import { findOrderForCustomer } from "@/lib/orders/service";
import { rateLimit } from "@/lib/rate-limit";
import { trackSchema } from "@/lib/validation";

export async function POST(req: Request) {
  if (!(await rateLimit("track", 15, 10 * 60_000))) {
    return json({ error: "Too many lookups. Wait a few minutes and try again." }, 429);
  }
  const parsed = trackSchema.safeParse(await readJson(req));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, 400);
  try {
    const order = await findOrderForCustomer(parsed.data.number, parsed.data.phone);
    // Same answer for "no such order" and "wrong phone", so numbers can't be probed.
    if (!order) return json({ error: "We couldn't find an order with that number and phone." }, 404);
    return json({ url: `/order/${order.number}?k=${order.accessToken}` });
  } catch (err) {
    return handleError(err, "track");
  }
}
