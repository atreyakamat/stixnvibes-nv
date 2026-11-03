import { json, readJson } from "@/lib/api";
import { accountsEnabled, CODE_GAP_MS, CODE_MINUTES, hashLoginCode, newLoginCode, sendLoginCode } from "@/lib/account";
import { storeMode } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { getStoreOrNull } from "@/lib/store";
import { loginCodeSchema } from "@/lib/validation";

// Step 1 of signing in: email a 6-digit code. Same answer whether or not the
// email already has an account, so this can't be used to look people up.
export async function POST(req: Request) {
  if (!(await rateLimit("login-code", 8, 60 * 60_000))) return json({ error: "Too many tries. Wait a while and try again." }, 429);
  const parsed = loginCodeSchema.safeParse(await readJson(req));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Check your email address." }, 400);
  if (parsed.data.company) return json({ error: "Invalid request." }, 400);
  const store = getStoreOrNull();
  if (!store || !accountsEnabled()) return json({ error: "Accounts aren't switched on yet. You can still order without one." }, 503);

  const { email } = parsed.data;
  const code = newLoginCode();
  const expiresAt = new Date(Date.now() + CODE_MINUTES * 60_000).toISOString();
  if (!(await store.saveLoginCode(email, hashLoginCode(email, code), expiresAt, CODE_GAP_MS))) {
    return json({ error: "A code was just sent. Check your inbox, or wait a minute for another." }, 429);
  }
  // Previews run in demo mode with no mail: the code comes back in the reply so the flow can be tried.
  if (storeMode() === "demo") return json({ ok: true, demoCode: code });
  if (!(await sendLoginCode(email, code))) return json({ error: "We couldn't send the email. Try again in a minute." }, 502);
  return json({ ok: true });
}
