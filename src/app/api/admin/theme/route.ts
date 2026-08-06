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

const DEFAULT_THEME = {
  announcement_enabled: true,
  announcement_text: "⚡ FREE Shipping on all orders above ₹499! Code: VIBE499",
  announcement_link: "/shop",
  logo_url: "/logo.svg",
  primary_color: "#FFB200",
  accent_color: "#E5261F",
  hero_title: "Stick Loud. Vibe Harder.",
  hero_subheadline: "Premium waterproof vinyl stickers, posters, Spotify cards & custom frames.",
  footer_tagline: "India's premier street culture sticker & custom poster store.",
};

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
      .eq("key", "theme_config")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ ok: true, data: DEFAULT_THEME });
      }
      if (isConnectionError(error.message)) {
        return NextResponse.json({ ok: false, error: `Database connection failed: ${error.message}` }, { status: 503 });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data?.value ?? DEFAULT_THEME });
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
    const theme = { ...DEFAULT_THEME, ...(body.theme || {}) };

    const admin = createService();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database service unavailable" }, { status: 503 });
    }

    const { error } = await admin.from("settings").upsert(
      {
        key: "theme_config",
        value: theme as any,
        category: "theme",
        description: "Storefront visual theme, colors, announcement bar, and hero copy",
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

    return NextResponse.json({ ok: true, data: theme });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isConnectionError(msg)) {
      return NextResponse.json({ ok: false, error: `Database connection error: ${msg}` }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
