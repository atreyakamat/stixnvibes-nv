export const dynamic = "force-dynamic";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "@/lib/zod-lite";
import { createService } from "@/lib/supabase/service";
import type { Database } from "@/types/supabase";
import { requireAdminAuth } from "@/lib/auth-guard";

function ok(data: unknown) {
  return NextResponse.json({ ok: true, data });
}
function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

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

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const type = url.searchParams.get("type") as Database["public"]["Enums"]["product_type"] | null;
  const featured = url.searchParams.get("featured") === "1";
  const limit = Number(url.searchParams.get("limit") ?? 200);

  const admin = createService();
  if (!admin) {
    return bad("Database service unconfigured or unavailable", 503);
  }

  try {
    let q = admin.from("products").select("*");
    if (type) q = q.eq("type", type);
    if (featured) q = q.eq("is_featured", true);
    q = q.limit(Math.min(Math.max(limit, 1), 500)).order("created_at", { ascending: false });

    const { data, error } = await q;
    if (error) {
      console.error("[/api/admin/products GET]", error.message);
      if (isConnectionError(error.message)) {
        return bad(`Database connection failed: ${error.message}`, 503);
      }
      return bad(error.message, 500);
    }
    return ok(data ?? []);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/admin/products GET catch]", msg);
    if (isConnectionError(msg)) {
      return bad(`Database connection error: ${msg}`, 503);
    }
    return bad(msg, 500);
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const admin = createService();
  if (!admin) return bad("Database not configured", 503);

  let body: any;
  try { body = await req.json(); } catch { return bad("Invalid JSON"); }

  // Handle Bulk Operations
  if (body?.bulkAction && Array.isArray(body?.ids)) {
    const { bulkAction, ids, status, tags, category } = body;
    try {
      if (bulkAction === "delete") {
        const { error } = await admin.from("products").delete().in("id", ids);
        if (error) return bad(error.message, 500);
        return ok({ bulk: true, action: "delete", count: ids.length });
      }
      if (bulkAction === "update_status" && status) {
        const { error } = await admin.from("products").update({ status } as never).in("id", ids);
        if (error) return bad(error.message, 500);
        return ok({ bulk: true, action: "update_status", count: ids.length });
      }
      if (bulkAction === "update_tags" && Array.isArray(tags)) {
        const { error } = await admin.from("products").update({ tags } as never).in("id", ids);
        if (error) return bad(error.message, 500);
        return ok({ bulk: true, action: "update_tags", count: ids.length });
      }
      if (bulkAction === "update_category" && category) {
        const { error } = await admin.from("products").update({ collection: category } as never).in("id", ids);
        if (error) return bad(error.message, 500);
        return ok({ bulk: true, action: "update_category", count: ids.length });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[/api/admin/products POST bulk]", msg);
      return bad("Database connection failed", 503);
    }
    return bad("Unknown bulk action");
  }

  // Single product create/update
  const {
    id, name, slug, description, short_description, price_cents, compare_at_cents,
    cost_cents, stock, min_stock, sku, barcode, type: productType, collection,
    category, tags, is_featured, customizable, status, images, image_url,
    metadata, seo_title, seo_description, seo_keywords, weight_grams,
    allow_image_upload, allow_text_input, allow_crop_rotate, allow_bg_removal,
    min_quantity, max_quantity, default_quantity, allowed_materials, allowed_papers,
    allowed_sizes, schedule_at,
  } = body;

  if (!name) return bad("Missing required field: name");

  const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!z.slug(finalSlug)) return bad("Invalid slug format");

  const payload = {
    ...(id ? { id } : {}),
    name,
    slug: finalSlug,
    description: description ?? null,
    short_description: short_description ?? null,
    price_cents: price_cents ?? 0,
    compare_at_cents: compare_at_cents ?? null,
    stock: stock ?? 0,
    type: productType ?? "sticker",
    collection: collection ?? null,
    tags: Array.isArray(tags) ? tags : [],
    is_featured: is_featured ?? false,
    customizable: customizable ?? false,
    status: status ?? "draft",
    images: Array.isArray(images) ? images : [],
    image_url: image_url ?? null,
    metadata: {
      cost_cents: cost_cents ?? null,
      min_stock: min_stock ?? 5,
      sku: sku ?? null,
      barcode: barcode ?? null,
      weight_grams: weight_grams ?? null,
      category: category ?? null,
      seo_title: seo_title ?? null,
      seo_description: seo_description ?? null,
      seo_keywords: seo_keywords ?? null,
      allow_image_upload: allow_image_upload ?? true,
      allow_text_input: allow_text_input ?? false,
      allow_crop_rotate: allow_crop_rotate ?? false,
      allow_bg_removal: allow_bg_removal ?? false,
      min_quantity: min_quantity ?? 1,
      max_quantity: max_quantity ?? 100,
      default_quantity: default_quantity ?? 1,
      allowed_materials: Array.isArray(allowed_materials) ? allowed_materials : [],
      allowed_papers: Array.isArray(allowed_papers) ? allowed_papers : [],
      allowed_sizes: Array.isArray(allowed_sizes) ? allowed_sizes : [],
      schedule_at: schedule_at ?? null,
      ...(metadata ?? {}),
    },
  };

  try {
    const { data, error } = await admin
      .from("products")
      .upsert(payload as never)
      .select()
      .single();

    if (error) return bad(error.message, 500);
    return ok(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/admin/products POST]", msg);
    return bad("Database connection failed", 503);
  }
}

export async function DELETE(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return bad("Missing required query parameter: id");

  const admin = createService();
  if (!admin) return bad("Database not configured", 503);

  try {
    const { error } = await admin.from("products").delete().eq("id", id);
    if (error) return bad(error.message, 500);
    return ok({ deleted: true, id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/admin/products DELETE]", msg);
    return bad("Database connection failed", 503);
  }
}
