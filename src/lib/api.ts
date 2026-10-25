import "server-only";
import { OrderError } from "@/lib/orders";
import { StoreUnavailableError } from "@/lib/store";

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/** Turns known errors into friendly JSON and hides everything else. */
export function handleError(err: unknown, where: string) {
  if (err instanceof OrderError) return json({ error: err.message, problems: err.problems }, 409);
  if (err instanceof StoreUnavailableError) return json({ error: "Online orders aren't open yet. Message us on Instagram." }, 503);
  console.error(`[${where}]`, err);
  return json({ error: "Something went wrong on our side. You can still send us your order on Instagram." }, 500);
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
