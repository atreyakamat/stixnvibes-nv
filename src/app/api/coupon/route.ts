import { json } from "@/lib/api";
import { COUPON_CODE_RE, couponProblem, normalizeCode } from "@/lib/pricing";
import { rateLimit } from "@/lib/rate-limit";
import { getStoreOrNull } from "@/lib/store";

// Looks up a code typed in the cart. Returns what the cart needs to show the
// discount; the order is priced again on the server with the code's uses.
export async function GET(req: Request) {
  if (!(await rateLimit("coupon", 30, 10 * 60_000))) return json({ error: "Too many tries. Wait a few minutes." }, 429);
  const url = new URL(req.url);
  const code = normalizeCode(url.searchParams.get("code") ?? "");
  const store = getStoreOrNull();
  const c = COUPON_CODE_RE.test(code) && store ? await store.getCoupon(code).catch(() => null) : null;
  if (!c) return json({ error: `We don't know the code ${code || "you typed"}.` }, 404);
  if (c.appOnly && url.searchParams.get("app") !== "1") return json({ error: `The code ${c.code} works only in the Stix app.`, appOnly: true }, 403);
  const uses = await store!.couponUses(c.code).catch(() => 0);
  // Only "not running" and "used up" matter here; the minimum is checked against the cart.
  const problem = couponProblem(c, Number.MAX_SAFE_INTEGER, uses);
  if (problem) return json({ error: problem }, 410);
  const { code: _c, percent, amountPaise, minOrderPaise, endsAt, description, freeStickers } = c;
  return json({ coupon: { code: _c, percent, amountPaise, minOrderPaise, endsAt, description, freeStickers } });
}
