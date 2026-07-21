export const dynamic = "force-dynamic";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "@/lib/zod-lite";
import { createService } from "@/lib/supabase/service";
import type { Database } from "@/types/supabase";

function ok(data: unknown) {
  return NextResponse.json({ ok: true, data });
}
function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") as Database["public"]["Enums"]["product_type"] | null;
  const featured = url.searchParams.get("featured") === "1";
  const limit = Number(url.searchParams.get("limit") ?? 20);

  const admin = createService();
  if (!admin) return bad("Database not configured", 503);

  let q = admin.from("products").select("*");
  if (type) q = q.eq("type", type);
  if (featured) q = q.eq("is_featured", true);
  q = q.limit(Math.min(Math.max(limit, 1), 100)).order("created_at", { ascending: false });

  const { data, error } = await q;
  if (error) return bad(error.message, 500);
  return ok(data);
}

export async function POST(req: NextRequest) {
  const admin = createService();
  if (!admin) return bad("Database not configured", 503);

  let body: any;
  try { body = await req.json(); } catch { return bad("Invalid JSON"); }
  if (typeof body?.name !== "string" || typeof body?.slug !== "string" || typeof body?.price_cents !== "number") {
    return bad("Missing required fields: name, slug, price_cents");
  }
  if (!z.slug(body.slug)) return bad("Invalid slug");

  const insertPayload = {
    name: body.name,
    slug: body.slug,
    description: body.description ?? null,
    short_description: body.short_description ?? null,
    price_cents: body.price_cents,
    compare_at_cents: body.compare_at_cents ?? null,
    image_url: body.image_url ?? null,
    type: body.type ?? "sticker",
    stock: body.stock ?? 0,
    is_featured: body.is_featured ?? false,
    is_bundle: body.is_bundle ?? false,
    is_limited: body.is_limited ?? false,
    customizable: body.customizable ?? false,
    tags: body.tags ?? [],
  };
  const { data, error } = await admin.from("products").insert(insertPayload as never).select().single();

  if (error) return bad(error.message, 500);
  return ok(data);
}
