import "server-only";
import { headers } from "next/headers";

// Best-effort, per-instance limiter for public forms. Serverless instances
// don't share memory, so this slows down scripts rather than stopping a
// determined attacker; Netlify's own rate limiting can sit in front of it.

const hits = new Map<string, number[]>();

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-nf-client-connection-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function rateLimit(bucket: string, limit: number, windowMs: number): Promise<boolean> {
  const key = `${bucket}:${await clientIp()}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}

/** Clears a bucket for this client, e.g. after a successful login. */
export async function clearRateLimit(bucket: string): Promise<void> {
  hits.delete(`${bucket}:${await clientIp()}`);
}
