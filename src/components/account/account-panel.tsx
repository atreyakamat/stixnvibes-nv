"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { DETAILS_KEY } from "@/components/cart/order-panel";
import { formatINR } from "@/lib/money";
import type { Account } from "@/lib/types";

export type AccountOrder = { number: string; status: string; totalPaise: number; createdAt: string; items: number; path: string };

const STATUS: Record<string, string> = { new: "Placed", confirmed: "Confirmed", paid: "Paid", shipped: "On its way", done: "Delivered", cancelled: "Cancelled" };
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function AccountPanel({ account, orders }: { account: Account; orders: AccountOrder[] }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [name, setName] = useState(account.data.details.name || account.name);
  const [phone, setPhone] = useState(account.data.details.phone);
  const [instagram, setInstagram] = useState(account.data.details.instagram);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    const details = { ...account.data.details, name: name.trim(), phone: phone.trim(), instagram: instagram.trim().replace(/^@/, "") };
    try {
      const res = await fetch("/api/app/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim().split(/\s+/)[0] ?? "", data: { ...account.data, details } }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't save. Try again.");
      try {
        window.localStorage.setItem(DETAILS_KEY, JSON.stringify({ ...details, note: "" }));
      } catch {
        // Checkout just won't prefill here.
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/app/account/logout", { method: "POST" });
    router.refresh();
  }

  async function remove() {
    if (!window.confirm("Delete your account? Your saved details and order list go. Orders we've already received stay with us.")) return;
    const res = await fetch("/api/app/account", { method: "DELETE" });
    if (res.ok) router.refresh();
    else setError("Couldn't delete. Try again.");
  }

  const item = (i: number) => (reduce ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { type: "spring" as const, stiffness: 300, damping: 28, delay: 0.05 * i } });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
      <motion.section {...item(0)} className="space-y-5 rounded-3xl border border-line bg-surface p-6">
        <div>
          <p className="label text-lemon">Signed in</p>
          <h2 className="display text-3xl">Hi {account.name || "there"}.</h2>
          <p className="text-sm text-mute">{account.email}</p>
        </div>
        <form onSubmit={save} className="space-y-3">
          <p className="text-sm text-paper/70">Checkout fills these in for you.</p>
          <div>
            <label htmlFor="a-name" className="label mb-2 block text-mute">
              Name
            </label>
            <input id="a-name" className="field" autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="a-phone" className="label mb-2 block text-mute">
              Mobile
            </label>
            <input id="a-phone" className="field" inputMode="tel" autoComplete="tel" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label htmlFor="a-ig" className="label mb-2 block text-mute">
              Instagram
            </label>
            <input id="a-ig" className="field" autoCapitalize="none" autoCorrect="off" maxLength={120} value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@yourname" />
          </div>
          <div aria-live="polite" className="min-h-5 text-sm">
            {error ? <span role="alert" className="text-[#ff7a59]">{error}</span> : saved ? <span className="text-lemon">Saved.</span> : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <motion.button whileTap={reduce ? undefined : { scale: 0.97 }} className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save details"}
            </motion.button>
            <button type="button" className="btn btn-ghost" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </form>
        <button type="button" className="text-sm text-mute underline-offset-4 hover:text-[#ff7a59] hover:underline" onClick={() => void remove()}>
          Delete my account
        </button>
      </motion.section>

      <motion.section {...item(1)} className="space-y-4">
        <h2 className="display text-3xl">Your orders</h2>
        {orders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line p-8 text-center">
            <p className="text-paper/80">Nothing here yet. Orders you place while signed in show up here.</p>
            <Link href="/shop" className="btn btn-primary mt-5 inline-flex">
              Browse the shop
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((o, i) => (
              <motion.li key={o.number} {...item(i + 2)}>
                <Link
                  href={o.path}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-lemon"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{o.number}</p>
                    <p className="text-sm text-mute">
                      {day(o.createdAt)} · {o.items} item{o.items === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium tabular-nums">{formatINR(o.totalPaise)}</p>
                    <p className={`label ${o.status === "cancelled" ? "text-mute" : "text-lemon"}`}>{STATUS[o.status] ?? o.status}</p>
                  </div>
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </motion.section>
    </div>
  );
}
