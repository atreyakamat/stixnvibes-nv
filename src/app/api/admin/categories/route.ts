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

/** GET /api/admin/categories — List all categories (hierarchical) */
export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const admin = createService();
  if (!admin) return bad("Database not configured", 503);

  const { data, error } = await admin
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return bad(error.message, 500);

  // Build tree structure for hierarchical display
  const rows = data as any[];
  const map = new Map<string, any>();
  const tree: any[] = [];

  for (const cat of rows) {
    map.set(cat.id, { ...cat, children: [] });
  }

  for (const cat of rows) {
    const node = map.get(cat.id)!;
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id)!.children.push(node);
    } else {
      tree.push(node);
    }
  }

  return ok({ flat: rows, tree });
}

/** POST /api/admin/categories — Create or update a category */
export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const admin = createService();
  if (!admin) return bad("Database not configured", 503);

  let body: any;
  try { body = await req.json(); } catch { return bad("Invalid JSON"); }

  if (!body?.name) return bad("Missing required field: name");

  const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!z.slug(slug)) return bad("Invalid slug format");

  const payload = {
    ...(body.id ? { id: body.id } : {}),
    name: body.name,
    slug,
    parent_id: body.parent_id ?? null,
    icon: body.icon ?? null,
    sort_order: body.sort_order ?? 0,
    is_featured: body.is_featured ?? false,
  };

  const { data, error } = await admin
    .from("categories")
    .upsert(payload as never)
    .select()
    .single();

  if (error) return bad(error.message, 500);
  return ok(data);
}

/** DELETE /api/admin/categories?id=<uuid> — Delete a category */
export async function DELETE(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return bad("Missing required query parameter: id");

  const admin = createService();
  if (!admin) return bad("Database not configured", 503);

  const { error } = await admin.from("categories").delete().eq("id", id);
  if (error) return bad(error.message, 500);
  return ok({ deleted: true, id });
}
