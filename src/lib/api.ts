import "server-only";
import { timingSafeEqual } from "node:crypto";
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

/** True when the request carries `Authorization: Bearer <token>`. Constant time. */
export function bearerMatches(req: Request, token: string) {
  const got = Buffer.from(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
  const want = Buffer.from(token);
  return got.length === want.length && timingSafeEqual(got, want);
}
