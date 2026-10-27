"use client";

import Link from "next/link";
import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { voidStallSaleAction } from "@/app/admin/stall-actions";
import { istToday } from "@/lib/costs";
import { formatINR, rupeesToPaise } from "@/lib/money";
import { defaultSelections, resolveOptions, type Selections } from "@/lib/pricing";
import { newSaleId, priceStallCart, saleLines, tally, type StallCartLine, type SyncResult } from "@/lib/stall";
import { PRODUCT_TYPES, type Offer, type OptionGroup, type Payment, type ProductType, type StallSale } from "@/lib/types";
import { upiLink } from "@/lib/upi";

export type StallProduct = {
  id: string;
  name: string;
  type: ProductType;
  image: string | null;
  pricePaise: number;
  options: OptionGroup[];
  stock: number | null;
  hidden: boolean;
};

type Props = {
  products: StallProduct[];
  offers: Offer[];
  stalls: { id: string; name: string; date: string; venue: string }[];
  defaultStallId: string | null;
  upi: { id: string; name: string } | null;
  /** Server totals per stall at page load, with the sale ids already counted. */
  synced: Record<string, { cash: number; upi: number; total: number; count: number; ids: string[] }>;
  loadedAt: string;
};

/** A sale kept on this phone: queued until the server has it. */
type LocalSale = StallSale & { synced: boolean; error?: string };

const QUEUE_KEY = "snv-stall-sales";
const STALL_KEY = "snv-stall-current";
const SYNC_EVERY_MS = 20_000;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the sale still syncs if the phone is online.
  }
}

const saleDay = (iso: string) => istToday(new Date(iso));
const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export function StallMode({ products, offers, stalls, defaultStallId, upi, synced, loadedAt }: Props) {
  const [stallId, setStallId] = useState<string>(defaultStallId ?? "");
  const [sales, setSales] = useState<LocalSale[]>([]);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [cart, setCart] = useState<StallCartLine[]>([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<ProductType | "">("");
  const [picking, setPicking] = useState<StallProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [applyOffers, setApplyOffers] = useState(true);
  const [extra, setExtra] = useState("");
  const [paying, setPaying] = useState<Payment | null>(null);
  const [notice, setNotice] = useState("");
  const salesRef = useRef<LocalSale[]>([]);

  // Load what this phone remembers. Browser-only, so it runs after mount.
  useEffect(() => {
    const stored = load<LocalSale[]>(QUEUE_KEY, []);
    const remembered = load<string>(STALL_KEY, "");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading localStorage, which only exists in the browser
    setSales(stored);
    salesRef.current = stored;
    if (!defaultStallId && remembered && stalls.some((s) => s.id === remembered)) setStallId(remembered);
    setOnline(navigator.onLine);
    setReady(true);
  }, [defaultStallId, stalls]);

  const updateSales = useCallback((fn: (prev: LocalSale[]) => LocalSale[]) => {
    const next = fn(salesRef.current)
      // Keep 3 days of history; never drop a sale that hasn't synced.
      .filter((x) => !x.synced || Date.now() - Date.parse(x.soldAt) < 3 * 86_400_000)
      .slice(0, 500);
    salesRef.current = next;
    setSales(next);
    save(QUEUE_KEY, next);
  }, []);

  const sync = useCallback(async () => {
    const pending = salesRef.current.filter((x) => !x.synced && !x.error).slice(0, 200);
    if (!pending.length || !navigator.onLine) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/stall-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sales: pending.map((q) => Object.fromEntries(Object.entries(q).filter(([k]) => k !== "synced" && k !== "error"))) }),
      });
      if (res.status === 401) {
        setNeedsLogin(true);
        return;
      }
      if (!res.ok) return;
      setNeedsLogin(false);
      const { results } = (await res.json()) as { results: SyncResult[] };
      const byId = new Map(results.map((r) => [r.id, r]));
      updateSales((prev) =>
        prev.map((x) => {
          const r = byId.get(x.id);
          if (!r) return x;
          if (r.ok) return { ...x, synced: true, error: undefined };
          return r.retry ? x : { ...x, error: r.error };
        }),
      );
    } catch {
      // Offline or the request dropped: the queue stays and retries.
    } finally {
      setSyncing(false);
    }
  }, [updateSales]);

  useEffect(() => {
    const up = () => {
      setOnline(true);
      void sync();
    };
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    const t = setInterval(() => void sync(), SYNC_EVERY_MS);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
      clearInterval(t);
    };
  }, [sync]);

  // The service worker keeps this page and its code on the phone, so it
  // opens again with no signal.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/stall-sw.js", { scope: "/admin/stall" })
      .then(async (reg) => {
        await navigator.serviceWorker.ready;
        const urls = [location.pathname, ...performance.getEntriesByType("resource").map((e) => e.name)].filter((u) => {
          try {
            const url = new URL(u, location.href);
            return url.origin === location.origin && (url.pathname.startsWith("/_next/static/") || url.pathname === "/admin/stall" || /\.(webp|png|jpg|jpeg|svg)$/.test(url.pathname));
          } catch {
            return false;
          }
        });
        (reg.active ?? navigator.serviceWorker.controller)?.postMessage({ type: "cache", urls });
      })
      .catch(() => {});
  }, []);

  const pickStall = (id: string) => {
    setStallId(id);
    save(STALL_KEY, id);
  };

  // Stock left = loaded count minus what this phone sold and hasn't synced.
  const unsyncedQty = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of sales) if (!x.synced) for (const l of x.lines) m.set(l.productId, (m.get(l.productId) ?? 0) + l.qty);
    return m;
  }, [sales]);
  const inCart = (id: string) => cart.filter((l) => l.productId === id).reduce((n, l) => n + l.qty, 0);
  const left = (p: StallProduct) => (p.stock === null ? null : p.stock - (unsyncedQty.get(p.id) ?? 0) - inCart(p.id));

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => (!type || p.type === type) && (!q || p.name.toLowerCase().includes(q)));
  }, [products, query, type]);

  const types = PRODUCT_TYPES.filter((t) => products.some((p) => p.type === t.id));

  function addLine(p: StallProduct, selections: Selections) {
    const r = resolveOptions(p, selections);
    if (!r) return;
    const key = `${p.id}|${JSON.stringify(r.selections)}`;
    const unit = Math.max(0, p.pricePaise + r.deltaPaise);
    setCart((c) => {
      const i = c.findIndex((l) => l.key === key);
      if (i >= 0) return c.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l));
      return [...c, { key, productId: p.id, name: p.name, type: p.type, options: r.labels, unitPricePaise: unit, qty: 1 }];
    });
  }

  function tap(p: StallProduct) {
    if (p.options.some((g) => g.values.length > 1)) setPicking(p);
    else addLine(p, defaultSelections(p));
  }

  const setQty = (key: string, qty: number) => setCart((c) => (qty <= 0 ? c.filter((l) => l.key !== key) : c.map((l) => (l.key === key ? { ...l, qty } : l))));

  const extraPaise = (() => {
    const p = rupeesToPaise(extra);
    return p && !Number.isNaN(p) ? p : 0;
  })();
  const price = priceStallCart(cart, offers, { applyOffers, extraDiscountPaise: extraPaise });
  const count = cart.reduce((n, l) => n + l.qty, 0);

  function record(payment: Payment) {
    if (!cart.length) return;
    const sale: LocalSale = {
      id: newSaleId(),
      stallId: stallId || null,
      lines: saleLines(cart),
      subtotalPaise: price.subtotalPaise,
      discountPaise: price.discountPaise,
      totalPaise: price.totalPaise,
      payment,
      note: "",
      soldAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      synced: false,
    };
    updateSales((prev) => [sale, ...prev]);
    setCart([]);
    setExtra("");
    setPaying(null);
    setCartOpen(false);
    setNotice(`${formatINR(sale.totalPaise)} ${payment === "cash" ? "cash" : "UPI"} saved${navigator.onLine ? "" : " on the phone. It syncs when you're back online"}.`);
    void sync();
  }

  async function undo(x: LocalSale) {
    if (!window.confirm(`Remove this ${formatINR(x.totalPaise)} sale? Its stock goes back.`)) return;
    if (!x.synced) {
      updateSales((prev) => prev.filter((y) => y.id !== x.id));
      return;
    }
    if (!navigator.onLine) {
      setNotice("Removing a synced sale needs signal. Try again when you're online.");
      return;
    }
    const res = await voidStallSaleAction(x.id).catch(() => ({ ok: false, error: "No signal." }));
    if (res.ok) updateSales((prev) => prev.filter((y) => y.id !== x.id));
    else setNotice(res.error ?? "Couldn't remove it.");
  }

  // Today's takings at this stall: the server's count at page load, plus
  // sales from this phone it didn't have yet.
  const today = istToday();
  const server = stallId ? synced[stallId] : undefined;
  const mine = sales.filter((x) => (x.stallId ?? "") === stallId && saleDay(x.soldAt) === today && !server?.ids.includes(x.id));
  const local = tally(mine);
  const takings = { total: (server?.total ?? 0) + local.total, cash: (server?.cash ?? 0) + local.cash, upi: (server?.upi ?? 0) + local.upi, count: (server?.count ?? 0) + local.count };
  const queued = sales.filter((x) => !x.synced && !x.error).length;
  const failed = sales.filter((x) => x.error);

  return (
    <div className="flex min-h-dvh flex-col pb-28">
      <header className="sticky top-0 z-30 space-y-3 border-b border-line bg-ink/95 px-3 pb-3 pt-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="label shrink-0 text-lemon" aria-label="Back to admin">
            ← Admin
          </Link>
          <select value={stallId} onChange={(e) => pickStall(e.target.value)} className="field min-w-0 flex-1 !py-2 text-sm" aria-label="Stall">
            <option value="">No stall (just a sale)</option>
            {stalls.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.date.slice(8)}/{s.date.slice(5, 7)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void sync()}
            className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium ${online ? "bg-lemon/15 text-lemon" : "bg-[#ff7a59]/15 text-[#ff7a59]"}`}
            data-testid="sync-status"
          >
            {!ready ? "…" : syncing ? "Syncing…" : !online ? `Offline${queued ? ` · ${queued} to sync` : ""}` : queued ? `${queued} to sync` : "Synced"}
          </button>
        </div>
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <p>
            <span className="text-mute">Today </span>
            <span className="font-semibold tabular-nums" data-testid="takings">
              {formatINR(takings.total)}
            </span>
            <span className="text-mute">
              {" "}
              · {takings.count} sale{takings.count === 1 ? "" : "s"} · cash {formatINR(takings.cash)} · UPI {formatINR(takings.upi)}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="field !py-2 text-sm" aria-label="Search products" />
        </div>
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3">
          {[{ id: "", label: "All" }, ...types].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id as ProductType | "")}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${type === t.id ? "bg-lemon text-ink" : "bg-paper/5 text-paper/80"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {needsLogin && (
          <p className="rounded-xl bg-[#ffb020]/15 px-3 py-2 text-sm">
            Your login ran out, so sales can&apos;t sync. They&apos;re safe on this phone.{" "}
            <a href="/admin/login" target="_blank" className="underline underline-offset-2">
              Log in in a new tab
            </a>
            , then come back and tap Sync.
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-xl bg-lemon/10 px-3 py-2 text-sm text-lemon" onClick={() => setNotice("")}>
            {notice}
          </p>
        )}
      </header>

      <ul className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-4 lg:grid-cols-6">
        {shown.map((p) => {
          const n = left(p);
          const out = n !== null && n <= 0;
          const qty = inCart(p.id);
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => tap(p)}
                className={`relative flex w-full flex-col rounded-2xl border p-2 text-left transition-colors active:scale-[0.98] ${qty ? "border-lemon" : "border-line"} ${out ? "opacity-50" : ""}`}
                aria-label={`Add ${p.name}`}
              >
                <span className="grid aspect-square place-items-center rounded-xl bg-paper/5 p-1">
                  {p.image ? <img src={p.image} alt="" loading="lazy" className="max-h-full w-auto object-contain" /> : <span className="text-xs text-mute">No photo</span>}
                </span>
                <span className="mt-1.5 line-clamp-2 text-xs leading-tight">{p.name}</span>
                <span className="mt-0.5 flex items-baseline justify-between text-xs">
                  <span className="font-semibold tabular-nums">{formatINR(p.pricePaise)}</span>
                  {n !== null && <span className="text-mute tabular-nums">{Math.max(0, n)} left</span>}
                </span>
                {qty > 0 && <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-lemon text-xs font-bold text-ink">{qty}</span>}
              </button>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => {
              const name = window.prompt("What is it? (e.g. Custom cut sticker)");
              if (!name?.trim()) return;
              const amount = rupeesToPaise(window.prompt("Price in ₹") ?? "");
              if (!amount || Number.isNaN(amount)) return;
              setCart((c) => [...c, { key: `other-${Date.now()}`, productId: "", name: name.trim().slice(0, 120), type: "other", options: [], unitPricePaise: amount, qty: 1 }]);
            }}
            className="grid aspect-[3/4] w-full place-items-center rounded-2xl border border-dashed border-line p-2 text-center text-xs text-mute"
          >
            + Something else
          </button>
        </li>
      </ul>

      {(sales.length > 0 || failed.length > 0) && (
        <section className="space-y-2 px-3 pb-6" aria-label="Recent sales">
          <h2 className="label text-mute">This phone, last 3 days</h2>
          <ul className="divide-y divide-line rounded-2xl border border-line text-sm">
            {sales.slice(0, 15).map((x) => (
              <li key={x.id} className="flex items-center gap-3 px-3 py-2">
                <span className="w-14 shrink-0 text-xs text-mute tabular-nums">{time.format(new Date(x.soldAt))}</span>
                <span className="min-w-0 flex-1 truncate">
                  {x.lines.reduce((n, l) => n + l.qty, 0)} items · {x.payment === "cash" ? "Cash" : "UPI"}
                  {x.error && <span className="block text-xs text-[#ff7a59]">Not saved: {x.error}</span>}
                </span>
                <span className="tabular-nums">{formatINR(x.totalPaise)}</span>
                <span className={`text-xs ${x.synced ? "text-lemon" : "text-mute"}`}>{x.synced ? "✓" : "…"}</span>
                <button type="button" onClick={() => void undo(x)} className="text-xs text-mute underline underline-offset-2">
                  Undo
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-mute">Page loaded {time.format(new Date(loadedAt))}. Reload when you have signal to get new products and stock.</p>
        </section>
      )}

      {picking && <OptionPicker product={picking} onClose={() => setPicking(null)} onAdd={(sel) => (addLine(picking, sel), setPicking(null))} />}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface">
        {cartOpen && cart.length > 0 && (
          <div className="max-h-[60dvh] space-y-3 overflow-y-auto p-3">
            <ul className="space-y-2">
              {cart.map((l) => (
                <li key={l.key} className="flex items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{l.name}</span>
                    {l.options.length > 0 && <span className="block truncate text-xs text-mute">{l.options.join(" · ")}</span>}
                  </span>
                  <button type="button" onClick={() => setQty(l.key, l.qty - 1)} className="grid size-9 place-items-center rounded-full bg-paper/10" aria-label={`One less ${l.name}`}>
                    −
                  </button>
                  <span className="w-6 text-center tabular-nums">{l.qty}</span>
                  <button type="button" onClick={() => setQty(l.key, l.qty + 1)} className="grid size-9 place-items-center rounded-full bg-paper/10" aria-label={`One more ${l.name}`}>
                    +
                  </button>
                  <span className="w-16 text-right tabular-nums">{formatINR(l.unitPricePaise * l.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={applyOffers} onChange={(e) => setApplyOffers(e.target.checked)} className="size-4 accent-lemon" />
                Shop offers{price.offerDiscountPaise > 0 && ` (−${formatINR(price.offerDiscountPaise)})`}
              </label>
              <label className="ml-auto flex items-center gap-2">
                Extra off ₹
                <input value={extra} onChange={(e) => setExtra(e.target.value)} inputMode="decimal" className="field w-20 !py-1.5 text-sm tabular-nums" aria-label="Extra discount in rupees" />
              </label>
            </div>
            <button type="button" onClick={() => setCart([])} className="text-xs text-mute underline underline-offset-2">
              Clear cart
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 p-3">
          <button type="button" onClick={() => setCartOpen((v) => !v)} className="min-w-0 flex-1 text-left" disabled={!cart.length} aria-expanded={cartOpen}>
            <span className="block text-xs text-mute">
              {count} item{count === 1 ? "" : "s"}
              {price.discountPaise > 0 && ` · −${formatINR(price.discountPaise)}`} {cart.length > 0 && (cartOpen ? "▾" : "▴")}
            </span>
            <span className="block text-2xl font-semibold tabular-nums" data-testid="stall-total">
              {formatINR(price.totalPaise)}
            </span>
          </button>
          <button type="button" disabled={!cart.length} onClick={() => setPaying("cash")} className="btn btn-ghost !px-5 !py-3 disabled:opacity-40">
            Cash
          </button>
          <button type="button" disabled={!cart.length} onClick={() => setPaying("upi")} className="btn btn-primary !px-5 !py-3 disabled:opacity-40">
            UPI
          </button>
        </div>
      </div>

      {paying && <PaySheet payment={paying} totalPaise={price.totalPaise} upi={upi} onCancel={() => setPaying(null)} onDone={() => record(paying)} />}
    </div>
  );
}

function OptionPicker({ product, onClose, onAdd }: { product: StallProduct; onClose: () => void; onAdd: (s: Selections) => void }) {
  const [sel, setSel] = useState<Selections>(() => defaultSelections(product));
  const r = resolveOptions(product, sel);
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/70 sm:items-center sm:justify-center" onClick={onClose}>
      <div role="dialog" aria-label={`Options for ${product.name}`} className="w-full space-y-4 rounded-t-3xl border border-line bg-surface p-5 sm:max-w-sm sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold">{product.name}</h2>
        {product.options
          .filter((g) => g.values.length > 1)
          .map((g) => (
            <fieldset key={g.id} className="space-y-2">
              <legend className="text-sm text-mute">{g.name}</legend>
              <div className="flex flex-wrap gap-2">
                {g.values.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSel((s) => ({ ...s, [g.id]: v.id }))}
                    className={`rounded-full px-3 py-2 text-sm ${sel[g.id] === v.id ? "bg-lemon text-ink" : "bg-paper/10"}`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        <button type="button" onClick={() => onAdd(sel)} className="btn btn-primary w-full justify-center">
          Add · {r ? formatINR(Math.max(0, product.pricePaise + r.deltaPaise)) : ""}
        </button>
      </div>
    </div>
  );
}

function PaySheet({ payment, totalPaise, upi, onCancel, onDone }: { payment: Payment; totalPaise: number; upi: Props["upi"]; onCancel: () => void; onDone: () => void }) {
  const [qr, setQr] = useState("");
  const [given, setGiven] = useState("");
  useEffect(() => {
    if (payment !== "upi" || !upi || totalPaise <= 0) return;
    // Made on the phone, so it works offline. The buyer's phone needs signal, not ours.
    QRCode.toString(upiLink({ upiId: upi.id, name: upi.name, amountPaise: totalPaise, note: "Stix N Vibes stall" }), { type: "svg", margin: 1 })
      .then(setQr)
      .catch(() => setQr(""));
  }, [payment, upi, totalPaise]);
  const givenPaise = rupeesToPaise(given);
  const change = givenPaise && !Number.isNaN(givenPaise) ? givenPaise - totalPaise : null;
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/70 sm:items-center sm:justify-center">
      <div role="dialog" aria-label={payment === "cash" ? "Cash payment" : "UPI payment"} className="w-full space-y-4 rounded-t-3xl border border-line bg-surface p-5 sm:max-w-sm sm:rounded-3xl">
        <p className="text-sm text-mute">{payment === "cash" ? "Cash" : "UPI"}</p>
        <p className="text-4xl font-semibold tabular-nums">{formatINR(totalPaise)}</p>
        {payment === "upi" &&
          (upi ? (
            qr ? (
              <div className="mx-auto w-56 rounded-2xl bg-white p-3" dangerouslySetInnerHTML={{ __html: qr }} aria-label={`UPI QR for ${formatINR(totalPaise)}`} />
            ) : (
              <p className="text-sm text-mute">Use your printed QR.</p>
            )
          ) : (
            <p className="text-sm text-mute">Use your printed QR. Add your UPI ID in Settings to show one here with the amount filled in.</p>
          ))}
        {payment === "cash" && (
          <label className="flex items-center gap-3 text-sm">
            They gave ₹
            <input value={given} onChange={(e) => setGiven(e.target.value)} inputMode="decimal" className="field w-28 !py-2 tabular-nums" autoFocus />
            {change !== null && <span className={change < 0 ? "text-[#ff7a59]" : "text-lemon"}>{change < 0 ? `${formatINR(-change)} short` : `Change ${formatINR(change)}`}</span>}
          </label>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="btn btn-ghost flex-1 justify-center">
            Back
          </button>
          <button type="button" onClick={onDone} className="btn btn-primary flex-[2] justify-center">
            {payment === "cash" ? "Cash received" : "Paid, save sale"}
          </button>
        </div>
      </div>
    </div>
  );
}
