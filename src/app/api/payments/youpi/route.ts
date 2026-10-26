import { json } from "@/lib/api";
import { youpiConfig } from "@/lib/env";
import { applyYoupiWebhook } from "@/lib/payments";
import { webhookIsGenuine, webhookSchema } from "@/lib/youpi";

// YouPI posts here when a payment succeeds, fails, expires or is cancelled.
// Set this URL as the merchant's webhook in the YouPI admin.
export async function POST(req: Request) {
  const cfg = youpiConfig();
  if (!cfg) return json({ error: "Not found." }, 404);
  const raw = await req.text();
  if (raw.length > 20_000 || !webhookIsGenuine(cfg.webhookSecret, raw, req.headers)) return json({ error: "Invalid signature." }, 401);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid body." }, 400);
  }
  const event = webhookSchema.safeParse(body);
  if (!event.success) return json({ error: "Invalid body." }, 400);
  try {
    const outcome = await applyYoupiWebhook(event.data);
    return json({ received: true, outcome });
  } catch (err) {
    console.error("[youpi webhook]", err);
    // 500 so YouPI retries later.
    return json({ error: "Try again." }, 500);
  }
}
