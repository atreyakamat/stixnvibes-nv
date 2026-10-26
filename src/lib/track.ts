import type { EventType } from "./types";

// Where a visitor came from, kept on their device only. A stall QR opens
// /?src=stall-wordsup&code=WORDSUP10; Instagram links use ?src=instagram or
// utm_source. Last touch wins and is forgotten after 30 days.

const SOURCE_KEY = "snv-source-v1";
const CODE_KEY = "snv-code-v1";
const VISIT_KEY = "snv-visit-v1";
const KEEP_MS = 30 * 24 * 60 * 60 * 1000;

const clean = (v: string) =>
  v.trim().toLowerCase().replace(/[^a-z0-9-_.]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The visitor's source, or "" for direct. */
export function getSource(): string {
  try {
    const saved = JSON.parse(store()?.getItem(SOURCE_KEY) ?? "null") as { s: string; at: number } | null;
    return saved && Date.now() - saved.at < KEEP_MS ? saved.s : "";
  } catch {
    return "";
  }
}

/** A coupon code that came in on a link, waiting for the cart. */
export const pendingCode = () => store()?.getItem(CODE_KEY) ?? "";
export const setPendingCode = (code: string) => {
  try {
    if (code) store()?.setItem(CODE_KEY, code);
    else store()?.removeItem(CODE_KEY);
  } catch {
    // Fine: the customer can type the code.
  }
};

/**
 * Reads ?src= / utm_source and ?code= from the address once per page load,
 * and counts one visit per browser session.
 */
export function captureVisit() {
  try {
    const q = new URLSearchParams(window.location.search);
    const src = clean(q.get("src") ?? q.get("utm_source") ?? "");
    const campaign = clean(q.get("utm_campaign") ?? "");
    if (src) store()?.setItem(SOURCE_KEY, JSON.stringify({ s: clean(campaign ? `${src}-${campaign}` : src), at: Date.now() }));
    const code = (q.get("code") ?? "").trim().toUpperCase();
    if (/^[A-Z0-9-]{3,20}$/.test(code)) setPendingCode(code);
    let first = false;
    try {
      first = !window.sessionStorage.getItem(VISIT_KEY);
      window.sessionStorage.setItem(VISIT_KEY, "1");
    } catch {
      first = true;
    }
    // A new source mid-session (scanned a second QR) counts as a visit too.
    if (first || src) track("visit");
  } catch {
    // Analytics must never break the shop.
  }
}

/** Fire-and-forget count for the admin dashboard. No cookies, no ids. */
export function track(type: EventType, productId: string | null = null) {
  try {
    const body = JSON.stringify([{ type, productId, path: window.location.pathname, source: getSource() }]);
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/events", blob)) {
      void fetch("/api/events", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    // Analytics must never break the shop.
  }
}
