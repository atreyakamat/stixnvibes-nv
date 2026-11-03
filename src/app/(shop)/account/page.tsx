import type { Metadata } from "next";
import { AccountPanel, type AccountOrder } from "@/components/account/account-panel";
import { SignIn } from "@/components/account/sign-in";
import { accountsEnabled, customerFromCookies, loadAccount } from "@/lib/account";
import { viewKeyMatches, orderPath } from "@/lib/orders";
import { getStoreOrNull } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false } };

export default async function AccountPage() {
  const store = getStoreOrNull();
  const email = store && accountsEnabled() ? await customerFromCookies() : null;

  let body;
  if (!store || !accountsEnabled()) {
    body = (
      <div className="mx-auto max-w-md rounded-3xl border border-dashed border-line p-8 text-center">
        <h2 className="display text-3xl">Accounts are coming.</h2>
        <p className="mt-3 text-paper/70">You can order without one. Everything works from the cart.</p>
      </div>
    );
  } else if (!email) {
    body = <SignIn />;
  } else {
    const account = await loadAccount(store, email);
    // Newest first, and only orders whose private key still checks out.
    const found = await Promise.all(
      account.data.orders.slice(0, 30).map(async (ref) => {
        const o = await store.getOrder(ref.number).catch(() => null);
        return o && viewKeyMatches(o, ref.key) ? o : null;
      }),
    );
    const orders: AccountOrder[] = found
      .filter((o) => o !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((o) => ({ number: o.number, status: o.status, totalPaise: o.totalPaise, createdAt: o.createdAt, items: o.lines.reduce((n, l) => n + l.qty, 0), path: orderPath(o) }));
    body = <AccountPanel account={account} orders={orders} />;
  }

  return (
    <div className="container-x py-12 md:py-20">
      <header className="mb-10 max-w-2xl space-y-3">
        <p className="label text-lemon">Account</p>
        <h1 className="display text-5xl md:text-7xl">Your stuff, everywhere.</h1>
      </header>
      {body}
    </div>
  );
}
