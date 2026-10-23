import { json, readJson } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { getStoreOrNull } from "@/lib/store";
import { eventsSchema } from "@/lib/validation";

// Anonymous counts for the admin dashboard: views, add to cart, order taps.
export async function POST(req: Request) {
  if (!(await rateLimit("events", 120, 10 * 60_000))) return new Response(null, { status: 204 });
  const parsed = eventsSchema.safeParse(await readJson(req));
  if (!parsed.success) return json({ error: "bad events" }, 400);
  try {
    await getStoreOrNull()?.track(parsed.data);
  } catch (err) {
    console.error("[events]", err);
  }
  return new Response(null, { status: 204 });
}
