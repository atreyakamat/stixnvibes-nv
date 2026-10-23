import { handleError, json, readJson } from "@/lib/api";
import { submitUtr } from "@/lib/orders/service";
import { rateLimit } from "@/lib/rate-limit";
import { utrSchema } from "@/lib/validation";

export async function POST(req: Request, ctx: RouteContext<"/api/orders/[number]/utr">) {
  if (!(await rateLimit("utr", 12, 10 * 60_000))) {
    return json({ error: "Too many tries. Wait a few minutes and try again." }, 429);
  }
  const { number } = await ctx.params;
  const parsed = utrSchema.safeParse(await readJson(req));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, 400);
  try {
    const order = await submitUtr(number.toUpperCase(), parsed.data.token, parsed.data.utr);
    return json({ status: order.status });
  } catch (err) {
    return handleError(err, "orders/utr");
  }
}
