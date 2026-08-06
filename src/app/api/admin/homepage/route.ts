import { NextResponse, type NextRequest } from "next/server";
import { createService } from "@/lib/supabase/service";
import { requireAdminAuth } from "@/lib/auth-guard";

function isConnectionError(message: string): boolean {
  const msg = message.toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("econnrefused") ||
    msg.includes("networkerror") ||
    msg.includes("failed to fetch") ||
    msg.includes("connect econnrefused")
  );
}

const DEFAULT_SECTIONS = [
  { id: "hero", name: "Hero Banner", enabled: true, sort_order: 1, headline: "Stick Loud. Vibe Harder.", subheadline: "Premium stickers, posters, Spotify cards & frames." },
  { id: "categories", name: "Featured Categories", enabled: true, sort_order: 2 },
  { id: "bestsellers", name: "Best Sellers", enabled: true, sort_order: 3 },
  { id: "new_arrivals", name: "New Arrivals", enabled: true, sort_order: 4 },
  { id: "customize", name: "Live Customizer Showcase", enabled: true, sort_order: 5 },
  { id: "collections", name: "Trending Collections", enabled: true, sort_order: 6 },
  { id: "why_us", name: "Why Choose Us", enabled: true, sort_order: 7 },
  { id: "reviews", name: "Customer Reviews", enabled: true, sort_order: 8 },
  { id: "instagram", name: "Instagram Feed", enabled: true, sort_order: 9 },
  { id: "newsletter", name: "Newsletter Signup", enabled: true, sort_order: 10 },
];

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const admin = createService();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Database service unconfigured or unavailable" }, { status: 503 });
  }

  try {
    const { data, error } = await admin
      .from("settings")
      .select("value")
      .eq("key", "homepage_layout")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Single row not found in database — fallback to default configuration
        return NextResponse.json({ ok: true, data: DEFAULT_SECTIONS });
      }
      if (isConnectionError(error.message)) {
        return NextResponse.json({ ok: false, error: `Database connection failed: ${error.message}` }, { status: 503 });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: (data as any)?.value ?? DEFAULT_SECTIONS });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isConnectionError(msg)) {
      return NextResponse.json({ ok: false, error: `Database connection error: ${msg}` }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const sections = body.sections || DEFAULT_SECTIONS;

    const admin = createService();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database service unavailable" }, { status: 503 });
    }

    const { error } = await admin.from("settings").upsert(
      {
        key: "homepage_layout",
        value: sections as any,
        category: "homepage",
        description: "Homepage section order, visibility, and copy configuration",
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "key" }
    );

    if (error) {
      if (isConnectionError(error.message)) {
        return NextResponse.json({ ok: false, error: `Database connection failed: ${error.message}` }, { status: 503 });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: sections });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isConnectionError(msg)) {
      return NextResponse.json({ ok: false, error: `Database connection error: ${msg}` }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
