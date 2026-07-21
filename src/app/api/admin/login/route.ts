import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * Demo admin-login route for the dev environment.
 * Accepts a JSON { email, password } and tries the Supabase password grant.
 *
 * For real prod auth use Supabase's hosted `sign-in/oauth` flow + email magic link
 * via the helper from @supabase/ssr — this route exists so the /admin page can
 * have a working gate behind a session cookie.
 */
export async function POST(req: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  if (typeof body?.email !== "string" || typeof body?.password !== "string") {
    return NextResponse.json({ ok: false, error: "Missing email/password" }, { status: 400 });
  }
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "apikey": serviceRoleKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: body.email, password: body.password }),
  });
  const json = await res.json();
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: json?.error_description ?? json?.error ?? "Login failed" }, { status: res.status });
  }
  return NextResponse.json({ ok: true, accessToken: json.access_token, refreshToken: json.refresh_token });
}
