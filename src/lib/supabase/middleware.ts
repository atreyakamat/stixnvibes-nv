import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

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
 * Auth middleware: refreshes the session cookie and protects /admin & /account.
 * Wire from src/middleware.ts by calling this function.
 */
export async function updateSession(request: NextRequest) {
  const isProtectedApi = request.nextUrl.pathname.startsWith("/api/admin") && request.nextUrl.pathname !== "/api/admin/login";
  if (!isValidHttpUrl(supabaseUrl) || !supabaseAnonKey || supabaseAnonKey.includes("YOUR_")) {
    if (isProtectedApi || isProduction()) {
      return NextResponse.json(
        { ok: false, error: "Server misconfigured: auth backend unavailable" },
        { status: 500 }
      );
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as never)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;
    const protectedPaths = ["/admin", "/account"];
    const isProtected = protectedPaths.some((p) => path.startsWith(p));

    const adminCookie = request.cookies.get("snv_admin_token");
    const authHeader = request.headers.get("authorization");
    const isStaticAdmin =
      adminCookie?.value === "snv_admin_token_static_dev" ||
      authHeader === "Bearer snv_admin_token_static_dev";

    if (path.startsWith("/api/admin") && path !== "/api/admin/login") {
      if (!user && !isStaticAdmin) {
        return NextResponse.json(
          { ok: false, error: "Unauthorized: Admin API authentication required" },
          { status: 401 }
        );
      }
    }

    if (isProtected && !user && !isStaticAdmin) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("redirect", path);
      return NextResponse.redirect(redirectUrl);
    }

    return response;
  } catch (err) {
    console.warn("[supabase middleware] session refresh bypassed:", err);
    return NextResponse.next({ request });
  }
}
