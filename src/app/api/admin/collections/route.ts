export const dynamic = "force-dynamic";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "@/lib/zod-lite";
import { createService } from "@/lib/supabase/service";
import { requireAdminAuth } from "@/lib/auth-guard";

function ok(data: unknown) {
  return NextResponse.json({ ok: true, data });
}
function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/** GET /api/admin/collections — List all collections with product counts */
export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const admin = createService();
  if (!admin) return bad("Database not configured", 503);

  const { data, error } = await admin
    .from("collections")
    .select("*, product_collections(product_id)")
    .order("sort_order", { ascending: true });

  if (error) return bad(error.message, 500);

  // Attach product_count to each collection
  const enriched = (data as any[]).map((c) => ({
    ...c,
    product_count: Array.isArray(c.product_collections) ? c.product_collections.length : 0,
    product_collections: undefined,
  }));

  return ok(enriched);
}

/** POST /api/admin/collections — Create or update a collection */
export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const admin = createService();
  if (!admin) return bad("Database not configured", 503);

  let body: any;
  try { body = await req.json(); } catch { return bad("Invalid JSON"); }

  // Handle adding/removing products from a collection
  if (body?.action === "add_products" && body?.collection_id && Array.isArray(body?.product_ids)) {
    const rows = body.product_ids.map((pid: string, i: number) => ({
      collection_id: body.collection_id,
      product_id: pid,
      sort_order: i,
    }));
    const { error } = await admin.from("product_collections").upsert(rows as never);
    if (error) return bad(error.message, 500);
    return ok({ added: true, count: rows.length });
  }

  if (body?.action === "remove_product" && body?.collection_id && body?.product_id) {
    const { error } = await admin
      .from("product_collections")
      .delete()
      .eq("collection_id", body.collection_id)
      .eq("product_id", body.product_id);
    if (error) return bad(error.message, 500);
    return ok({ removed: true });
  }

  // Standard create/update
  if (!body?.name) return bad("Missing required field: name");

  const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!z.slug(slug)) return bad("Invalid slug format");

  const payload = {
    ...(body.id ? { id: body.id } : {}),
    name: body.name,
    slug,
    description: body.description ?? null,
    image_url: body.image_url ?? null,
    is_active: body.is_active ?? true,
    sort_order: body.sort_order ?? 0,
    metadata: body.metadata ?? {},
  };

  const { data, error } = await admin
    .from("collections")
    .upsert(payload as never)
    .select()
    .single();

  if (error) return bad(error.message, 500);
  return ok(data);
}

/** DELETE /api/admin/collections?id=<uuid> — Delete a collection */
export async function DELETE(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return bad("Missing required query parameter: id");

  const admin = createService();
  if (!admin) return bad("Database not configured", 503);

  const { error } = await admin.from("collections").delete().eq("id", id);
  if (error) return bad(error.message, 500);
  return ok({ deleted: true, id });
}
