import { handleError, json, readJson } from "@/lib/api";
import { ORDER_NUMBER_RE } from "@/lib/constants";
import { reviewOrderNumber } from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";
import { reviewSchema } from "@/lib/validation";

// A customer review from the website or the app. Always saved as pending:
// nothing shows until the shop publishes it in admin. With an order number
// and that order's private key, and the product in that order, the review
// is marked as from a verified buyer; otherwise it is an ordinary review
// (most sales are at stalls, with no online order).

export async function POST(req: Request) {
  if (!(await rateLimit("review", 6, 60 * 60_000))) return json({ error: "Too many reviews in a short time. Try again later." }, 429);
  const parsed = reviewSchema.safeParse(await readJson(req));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, 400);
  const r = parsed.data;
  if (r.company) return json({ error: "Invalid request." }, 400);
  try {
    const store = getStore();
    const product = await store.getProduct(r.productId);
    if (!product || product.status === "hidden") return json({ error: "That product isn't in the shop any more." }, 404);

    const number = r.orderNumber?.toUpperCase();
    const order = number && ORDER_NUMBER_RE.test(number) ? await store.getOrder(number) : null;
    const orderNumber = order ? reviewOrderNumber(order, r.key, product.id) : null;

    const review = await store.createReview({ productId: product.id, orderNumber, name: r.name, instagram: r.instagram, rating: r.rating, text: r.text, photos: r.photos });
    return json({ id: review.id });
  } catch (err) {
    if (err instanceof Error && /already has a review/.test(err.message)) return json({ error: err.message }, 409);
    return handleError(err, "review");
  }
}
