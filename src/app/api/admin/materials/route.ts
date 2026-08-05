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

/** GET /api/admin/materials — List all materials */
export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const admin = createService();
  if (!admin) return bad("Database not configured", 503);

  const { data, error } = await admin
    .from("materials")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return bad(error.message, 500);
  return ok(data);
}

/** POST /api/admin/materials — Create or update a material */
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
    description: body.description ?? null,
    properties: body.properties ?? {},
    cost_per_unit_cents: body.cost_per_unit_cents ?? 0,
    is_active: body.is_active ?? true,
    sort_order: body.sort_order ?? 0,
  };

  const { data, error } = await admin
    .from("materials")
    .upsert(payload as never)
    .select()
    .single();

  if (error) return bad(error.message, 500);
  return ok(data);
}

/** DELETE /api/admin/materials?id=<uuid> — Delete a material */
export async function DELETE(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return bad("Missing required query parameter: id");

  const admin = createService();
  if (!admin) return bad("Database not configured", 503);

  const { error } = await admin.from("materials").delete().eq("id", id);
  if (error) return bad(error.message, 500);
  return ok({ deleted: true, id });
}
