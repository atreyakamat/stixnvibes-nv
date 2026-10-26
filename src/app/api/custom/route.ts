import { handleError, json, readJson } from "@/lib/api";
import { createCustomRequest } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { customRequestSchema } from "@/lib/validation";

// A customer's own design for a quote. Files are uploaded first through
// /api/upload; this only takes their ids.
export async function POST(req: Request) {
  if (!(await rateLimit("custom", 6, 10 * 60_000))) return json({ error: "Too many requests in a short time. Message us on Instagram." }, 429);
  const parsed = customRequestSchema.safeParse(await readJson(req));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, 400);
  if (parsed.data.company) return json({ error: "Invalid request." }, 400);
  try {
    const r = await createCustomRequest(parsed.data);
    return json({ number: r.number });
  } catch (err) {
    if (err instanceof Error && /didn't upload/.test(err.message)) return json({ error: err.message }, 400);
    return handleError(err, "custom");
  }
}
