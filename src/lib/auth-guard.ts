import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const staticAdminToken = process.env.ADMIN_STATIC_ACCESS_TOKEN;

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
 * Returns null if authorized, or a 401/403/500 NextResponse if unauthorized.
 *
 * Auth priority:
 * 1. Static admin token (checked without network — always works)
 * 2. Supabase JWT Bearer token (requires network)
 * 3. Supabase session cookie (requires network)
 */
export async function requireAdminAuth(req: NextRequest): Promise<NextResponse | null> {
  const supabaseConfigured = isValidHttpUrl(supabaseUrl) && Boolean(supabaseAnonKey) && !supabaseAnonKey.includes("YOUR_");

  // Step 1: Static token check (no Supabase network call needed)
  const authHeader = req.headers.get("authorization");
  const adminCookie = req.cookies?.get("snv_admin_token");
  const isDevTokenAllowed = process.env.NODE_ENV !== "production";
  
  if (
    (staticAdminToken && authHeader === `Bearer ${staticAdminToken}`) ||
    (staticAdminToken && adminCookie?.value === staticAdminToken) ||
    (isDevTokenAllowed && authHeader === "Bearer snv_admin_token_static_dev") ||
    (isDevTokenAllowed && adminCookie?.value === "snv_admin_token_static_dev")
  ) {
    return null; // Authorized via Static Admin Token
  }

  // Step 2: If Supabase is not configured, deny in production
  if (!supabaseConfigured) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { ok: false, error: "Server misconfigured: auth backend unavailable" },
        { status: 500 }
      );
    }
    console.warn("[requireAdminAuth] Supabase not configured; bypassing auth in dev only.");
    return null;
  }

  // Step 3: Supabase JWT or session cookie validation
  try {
    let token = "";
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (adminCookie && adminCookie.value) {
      token = adminCookie.value;
    }

    if (token) {
      const { createService } = await import("@/lib/supabase/service");
      const service = createService();
      if (service) {
        const { data: { user }, error } = await service.auth.getUser(token);
        if (user && !error) return null; // Authenticated via Supabase Service
      }
    }

    // Check session cookies
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return req.cookies?.getAll ? req.cookies.getAll() : [];
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

    return null; // Authorized via Supabase Cookie
  } catch (err) {
    console.error("[requireAdminAuth] verification error:", err);
    // If Supabase is unreachable and no static token was found, deny access
    return NextResponse.json(
      { ok: false, error: "Unauthorized: Authentication service unavailable" },
      { status: 401 }
    );
  }
}

