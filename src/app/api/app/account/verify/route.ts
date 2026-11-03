import { cookies } from "next/headers";
import { json, readJson } from "@/lib/api";
import { CUSTOMER_COOKIE, customerCookieOptions, hashLoginCode, issueCustomerToken, loadAccount } from "@/lib/account";
import { clearRateLimit, rateLimit } from "@/lib/rate-limit";
import { getStoreOrNull } from "@/lib/store";
import { loginVerifySchema } from "@/lib/validation";

// Step 2: the code the customer typed. A new email gets an account here.
export async function POST(req: Request) {
  if (!(await rateLimit("login-verify", 20, 10 * 60_000))) return json({ error: "Too many tries. Wait a few minutes." }, 429);
  const parsed = loginVerifySchema.safeParse(await readJson(req));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Check the code." }, 400);
  const { email, code, name, web } = parsed.data;
  const store = getStoreOrNull();
  if (!store) return json({ error: "Accounts aren't switched on yet." }, 503);

  const result = await store.checkLoginCode(email, hashLoginCode(email, code));
  if (result === "wrong") return json({ error: "That code isn't right. Check it and try again." }, 400);
  if (result === "locked") return json({ error: "Too many wrong tries. Ask for a new code." }, 429);
  if (result === "expired") return json({ error: "That code has expired. Ask for a new one." }, 410);

  const existing = await store.getAccount(email);
  const account = existing ?? (await store.saveAccount(email, name, (await loadAccount(store, email)).data));
  const issued = issueCustomerToken(email);
  if (!issued) return json({ error: "Accounts aren't switched on yet." }, 503);
  await clearRateLimit("login-verify");
  if (web) (await cookies()).set(CUSTOMER_COOKIE, issued.token, customerCookieOptions);
  return json({ ...(web ? { expiresAt: issued.expiresAt } : issued), account, isNew: !existing });
}
