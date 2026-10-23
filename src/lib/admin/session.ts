import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { adminEmails, DEMO_ADMIN, sessionSecret, storeMode, supabaseConfig } from "@/lib/env";

export const SESSION_COOKIE = "snv_admin";
const SESSION_HOURS = 12;

type Session = { email: string; exp: number };

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function encodeSession(session: Session, secret: string): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function decodeSession(value: string, secret: string, now = Date.now()): Session | null {
  const [payload, mac] = value.split(".");
  if (!payload || !mac) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    return typeof s.email === "string" && typeof s.exp === "number" && s.exp > now ? s : null;
  } catch {
    return null;
  }
}

function isAllowed(email: string): boolean {
  if (storeMode() === "demo" && email === DEMO_ADMIN.email) return true;
  return adminEmails().includes(email.toLowerCase());
}

/** The signed-in admin, or null. Re-checks the allowlist on every request. */
export async function getAdmin(): Promise<{ email: string } | null> {
  const secret = sessionSecret();
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!secret || !value) return null;
  const s = decodeSession(value, secret);
  return s && isAllowed(s.email) ? { email: s.email } : null;
}

/** Use at the top of every admin page and server action. */
export async function requireAdmin(): Promise<{ email: string }> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export type LoginResult = { ok: true } | { ok: false; error: string };

/**
 * Checks credentials against Supabase Auth (or the demo login in demo mode)
 * and that the email is on ADMIN_EMAILS, then sets a signed session cookie.
 */
export async function login(emailRaw: string, password: string): Promise<LoginResult> {
  const email = emailRaw.trim().toLowerCase();
  const secret = sessionSecret();
  const generic = { ok: false as const, error: "Wrong email or password, or this account isn't an admin." };
  if (!secret) return { ok: false, error: "ADMIN_SESSION_SECRET isn't set (needs 32+ characters)." };

  const mode = storeMode();
  if (mode === "demo") {
    if (email !== DEMO_ADMIN.email || password !== DEMO_ADMIN.password) return generic;
  } else if (mode === "supabase") {
    if (!isAllowed(email)) return generic;
    const cfg = supabaseConfig()!;
    const anonKey = process.env.SUPABASE_ANON_KEY || cfg.serviceKey;
    const auth = createClient(cfg.url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } }).auth;
    const { data, error } = await auth.signInWithPassword({ email, password });
    if (error || data.user?.email?.toLowerCase() !== email) return generic;
  } else {
    return { ok: false, error: "The shop database isn't configured yet." };
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, encodeSession({ email, exp: Date.now() + SESSION_HOURS * 3600_000 }, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  return { ok: true };
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
}
