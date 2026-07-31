import { NextResponse, type NextRequest } from "next/server";

const STATIC_ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@stixnvibes.com";
const STATIC_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "stixnvibes123";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

/**
 * Admin Login Route with Static Password Support & Supabase Fallback.
 * Allows login with static admin credentials (email: admin@stixnvibes.com, pass: stixnvibes123 or admin)
 * as well as Supabase Auth password grant.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Missing email or password" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const authBackendConfigured = Boolean(supabaseUrl && serviceRoleKey && !supabaseUrl.includes("YOUR_"));

  if (isProduction() && !authBackendConfigured) {
    return NextResponse.json(
      { ok: false, error: "Server misconfigured: auth backend unavailable" },
      { status: 503 }
    );
  }

  // 1. Static Admin Credentials Check
  if (
    (email === STATIC_ADMIN_EMAIL.toLowerCase() || email === "admin@stixnvibes.com") &&
    (password === STATIC_ADMIN_PASSWORD || password === "stixnvibes123" || password === "admin")
  ) {
    const res = NextResponse.json({
      ok: true,
      accessToken: "snv_admin_token_static_dev",
      user: { email, role: "admin" },
      message: "Authenticated via static admin credentials",
    });
    res.cookies.set("snv_admin_token", "snv_admin_token_static_dev", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
    });
    return res;
  }

  // 2. Supabase password grant check (if configured)
  if (authBackendConfigured) {
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "apikey": serviceRoleKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (res.ok && json?.access_token) {
        const response = NextResponse.json({
          ok: true,
          accessToken: json.access_token,
          refreshToken: json.refresh_token,
        });
        response.cookies.set("snv_admin_token", json.access_token, {
          httpOnly: true,
          path: "/",
          sameSite: "lax",
        });
        return response;
      }
    } catch (err) {
      console.warn("[admin/login] Supabase auth attempt failed:", err);
    }
  }

  return NextResponse.json({ ok: false, error: "Invalid admin email or password" }, { status: 401 });
}
