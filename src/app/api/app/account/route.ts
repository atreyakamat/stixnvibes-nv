import { json, readJson } from "@/lib/api";
import { customerFromRequest, loadAccount, mergeOrders } from "@/lib/account";
import { getStoreOrNull } from "@/lib/store";
import { accountSaveSchema } from "@/lib/validation";

// The signed-in customer's account: read it, save changes, or delete it.
// "Signed in" is the app's bearer token or the website's cookie.

export async function GET(req: Request) {
  const email = customerFromRequest(req);
  const store = getStoreOrNull();
  if (!email || !store) return json({ error: "Sign in to see your account." }, 401);
  return json({ account: await loadAccount(store, email) });
}

export async function PUT(req: Request) {
  const email = customerFromRequest(req);
  const store = getStoreOrNull();
  if (!email || !store) return json({ error: "Sign in to save your account." }, 401);
  const parsed = accountSaveSchema.safeParse(await readJson(req));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Check your details." }, 400);
  const current = await loadAccount(store, email);
  // Details and taste are replaced by what the phone sends; order links only ever grow.
  const data = { ...parsed.data.data, orders: mergeOrders(current.data.orders, parsed.data.data.orders) };
  return json({ account: await store.saveAccount(email, parsed.data.name, data) });
}

export async function DELETE(req: Request) {
  const email = customerFromRequest(req);
  const store = getStoreOrNull();
  if (!email || !store) return json({ error: "Sign in first." }, 401);
  await store.deleteAccount(email);
  return json({ ok: true });
}
