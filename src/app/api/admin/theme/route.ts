import { NextResponse, type NextRequest } from "next/server";
import { createService } from "@/lib/supabase/service";
import { requireAdminAuth } from "@/lib/auth-guard";

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

  try {
    const admin = createService();
    if (!admin) return NextResponse.json({ ok: true, data: DEFAULT_THEME });

    const { data, error } = await admin
      .from("settings")
      .select("value")
      .eq("key", "theme_config")
      .single();

    if (error || !data || !(data as any).value) {
      return NextResponse.json({ ok: true, data: DEFAULT_THEME });
    }

    return NextResponse.json({ ok: true, data: (data as any).value });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
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
      return NextResponse.json({ ok: false, error: "Database service unavailable" }, { status: 500 });
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
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: theme });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
