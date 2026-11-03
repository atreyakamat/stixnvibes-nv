import "server-only";
import { createHmac, randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { decodeSession, encodeSession } from "@/lib/admin/session";
import { customerMailConfig, sessionSecret, storeMode } from "@/lib/env";
import { escapeHtml, mailCustomer } from "@/lib/mail";
import type { Store } from "@/lib/store/types";
import { ACCOUNT_ORDERS_MAX, EMPTY_ACCOUNT_DATA, type Account, type AccountData, type Order } from "@/lib/types";

// Customer accounts. A customer asks for a code by email, types it in, and
// gets a signed token (the app keeps it) or a cookie (the website). Nothing
// else is stored about them than what they save themselves. Accounts are
// optional: guest checkout is unchanged.

export const CUSTOMER_COOKIE = "snv_customer";
export const CODE_MINUTES = 10;
export const CODE_GAP_MS = 45_000;
export const TOKEN_DAYS = 90;

/** Sign-in needs a way to send the code (or demo mode) and a signing secret. */
export function accountsEnabled(): boolean {
  if (!sessionSecret()) return false;
  return storeMode() === "demo" || (storeMode() === "supabase" && customerMailConfig() !== null);
}

export const newLoginCode = () => String(randomInt(1_000_000)).padStart(6, "0");

/** The code is only ever stored hashed, bound to the email it was sent to. */
export function hashLoginCode(email: string, code: string): string {
  return createHmac("sha256", sessionSecret() ?? "").update(`login:${email}:${code}`).digest("base64url");
}

// A key of its own, so an admin cookie or admin app token can't be replayed
// as a customer token or the other way round.
const customerKey = (secret: string) => createHmac("sha256", secret).update("stixnvibes-customer-v1").digest("base64url");

export function issueCustomerToken(email: string, now = Date.now()): { token: string; expiresAt: string } | null {
  const secret = sessionSecret();
  if (!secret) return null;
  const exp = now + TOKEN_DAYS * 86_400_000;
  return { token: encodeSession({ email, exp }, customerKey(secret)), expiresAt: new Date(exp).toISOString() };
}

export function customerFromToken(token: string | undefined | null, now = Date.now()): string | null {
  const secret = sessionSecret();
  if (!secret || !token) return null;
  return decodeSession(token, customerKey(secret), now)?.email ?? null;
}

function cookieValue(header: string | null, name: string): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return undefined;
}

/** The signed-in customer's email for an API request: app bearer token, or the website cookie. */
export function customerFromRequest(req: Request): string | null {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return customerFromToken(bearer || cookieValue(req.headers.get("cookie"), CUSTOMER_COOKIE));
}

/** The signed-in customer on a website page. */
export async function customerFromCookies(): Promise<string | null> {
  return customerFromToken((await cookies()).get(CUSTOMER_COOKIE)?.value);
}

export const customerCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: TOKEN_DAYS * 86_400,
};

/** Emails the code. Returns false if it couldn't be sent. */
export function sendLoginCode(email: string, code: string): Promise<boolean> {
  return mailCustomer(email, {
    subject: `${code} is your Stix N Vibes code`,
    text: `Your Stix N Vibes sign-in code is ${code}. It works for ${CODE_MINUTES} minutes. If you didn't ask for it, ignore this email.`,
    html: `<p>Your Stix N Vibes sign-in code is</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${escapeHtml(code)}</p><p>It works for ${CODE_MINUTES} minutes. If you didn't ask for it, ignore this email.</p>`,
  });
}

/** Account data with order links from both sides kept: nothing a customer placed is ever dropped. */
export function mergeOrders(saved: AccountData["orders"], incoming: AccountData["orders"]): AccountData["orders"] {
  const seen = new Set<string>();
  const out: AccountData["orders"] = [];
  for (const o of [...incoming, ...saved]) {
    if (seen.has(o.number)) continue;
    seen.add(o.number);
    out.push(o);
  }
  return out.slice(0, ACCOUNT_ORDERS_MAX);
}

export async function loadAccount(store: Store, email: string): Promise<Account> {
  return (await store.getAccount(email)) ?? { email, name: "", data: structuredClone(EMPTY_ACCOUNT_DATA), createdAt: "", updatedAt: "" };
}

/** Adds a just-placed order to the signed-in customer's account. Never fails the order. */
export async function linkOrderToAccount(store: Store, email: string | null, order: Pick<Order, "number" | "viewKey">): Promise<void> {
  if (!email) return;
  try {
    const acc = await loadAccount(store, email);
    const data = { ...acc.data, orders: mergeOrders(acc.data.orders, [{ number: order.number, key: order.viewKey }]) };
    await store.saveAccount(email, acc.name, data);
  } catch (err) {
    console.error("[account] couldn't link order", err);
  }
}
