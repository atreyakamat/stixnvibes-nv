import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: import("next/server").NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Protect /admin, /account, /api/admin, and run on every page for session refresh
    "/((?!_next/static|_next/image|favicon.svg|robots.txt|sitemap.xml|manifest.webmanifest).*)",
  ],
};

