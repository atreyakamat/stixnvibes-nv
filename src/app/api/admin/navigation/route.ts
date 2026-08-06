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

const DEFAULT_NAVIGATION = {
  header_menu: [
    { label: "Shop All", url: "/shop" },
    { label: "Stickers", url: "/shop?type=sticker" },
    { label: "Posters", url: "/shop?type=poster" },
    { label: "Spotify Cards", url: "/customize/spotify-card" },
    { label: "Customizer", url: "/customize" },
  ],
  footer_menu: [
    { label: "About Us", url: "/about" },
    { label: "Contact", url: "/contact" },
    { label: "FAQ", url: "/faq" },
    { label: "Order Tracking", url: "/track" },
    { label: "Privacy Policy", url: "/policies/privacy" },
    { label: "Refund Policy", url: "/policies/refund" },
  ],
  social_links: {
    instagram: "https://instagram.com/stixnvibes",
    whatsapp: "https://wa.me/919999999999",
    facebook: "https://facebook.com/stixnvibes",
  },
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
      .eq("key", "navigation_config")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ ok: true, data: DEFAULT_NAVIGATION });
      }
      if (isConnectionError(error.message)) {
        return NextResponse.json({ ok: false, error: `Database connection failed: ${error.message}` }, { status: 503 });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: (data as any)?.value ?? DEFAULT_NAVIGATION });
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
    const navigation = { ...DEFAULT_NAVIGATION, ...(body.navigation || {}) };

    const admin = createService();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database service unavailable" }, { status: 503 });
    }

    const { error } = await admin.from("settings").upsert(
      {
        key: "navigation_config",
        value: navigation as any,
        category: "navigation",
        description: "Storefront header menus, footer links, social media links, and policies",
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

    return NextResponse.json({ ok: true, data: navigation });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isConnectionError(msg)) {
      return NextResponse.json({ ok: false, error: `Database connection error: ${msg}` }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
