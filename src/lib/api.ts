import "server-only";
import type { z } from "zod";
import { CheckoutError } from "@/lib/orders/service";
import { StoreUnavailableError } from "@/lib/store";

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}

/** Turns known errors into friendly JSON and hides everything else. */
export function handleError(err: unknown, where: string) {
  if (err instanceof CheckoutError) return json({ error: err.message, problems: err.problems }, 409);
  if (err instanceof StoreUnavailableError) return json({ error: "Online orders aren't open yet." }, 503);
  console.error(`[${where}]`, err);
  return json({ error: "Something went wrong on our side. Please try again, or message us on Instagram." }, 500);
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
