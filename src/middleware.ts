import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: import("next/server").NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Protect /admin and /account, and run on every request for session refresh
    "/((?!_next/static|_next/image|favicon.svg|robots.txt|sitemap.xml|manifest.webmanifest|api).*)",
  ],
};
