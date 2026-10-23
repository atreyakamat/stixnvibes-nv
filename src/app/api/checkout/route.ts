import { fieldErrors, handleError, json, readJson } from "@/lib/api";
import { createOrder } from "@/lib/orders/service";
import { rateLimit } from "@/lib/rate-limit";
import { checkoutSchema } from "@/lib/validation";

export async function POST(req: Request) {
  if (!(await rateLimit("checkout", 10, 10 * 60_000))) {
    return json({ error: "Too many orders from this connection. Try again in a few minutes." }, 429);
  }
  const parsed = checkoutSchema.safeParse(await readJson(req));
  if (!parsed.success) return json({ error: "Check the highlighted fields.", fields: fieldErrors(parsed.error) }, 400);
  try {
    const order = await createOrder(parsed.data);
    return json({ number: order.number, token: order.accessToken }, 201);
  } catch (err) {
    return handleError(err, "checkout");
  }
}
