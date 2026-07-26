import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function isValidHttpUrl(url: string): boolean {
  try {
    if (!url || url.includes("YOUR_") || url.includes("PLACEHOLDER")) return false;
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validates that the incoming request is authenticated as an admin user.
 * Returns null if authorized, or a 401/403 NextResponse if unauthorized.
 */
export async function requireAdminAuth(req: NextRequest): Promise<NextResponse | null> {
  const supabaseConfigured = isValidHttpUrl(supabaseUrl) && Boolean(supabaseAnonKey) && !supabaseAnonKey.includes("YOUR_");

  // Hard fail closed in production if Supabase is not configured.
  if (!supabaseConfigured) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { ok: false, error: "Server misconfigured: auth backend unavailable" },
        { status: 500 }
      );
    }
    // Local dev: bypass with a server-side warning the developer can see in logs.
    console.warn("[requireAdminAuth] Supabase not configured; bypassing auth in dev only.");
    return null;
  }

  try {
    // Check Authorization Header if present
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const { createService } = await import("@/lib/supabase/service");
      const service = createService();
      if (service) {
        const { data: { user }, error } = await service.auth.getUser(token);
        if (user && !error) return null; // Authenticated
      }
    }

    // Check session cookies
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {},
      },
    });

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized: Admin access required" },
        { status: 401 }
      );
    }

    return null; // Authorized
  } catch (err) {
    console.error("[requireAdminAuth] verification error:", err);
    return NextResponse.json(
      { ok: false, error: "Authentication verification failed" },
      { status: 500 }
    );
  }
}
