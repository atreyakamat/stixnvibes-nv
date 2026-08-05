export const dynamic = "force-dynamic";
import { NextResponse, type NextRequest } from "next/server";
import { createService } from "@/lib/supabase/service";
import { requireAdminAuth } from "@/lib/auth-guard";

function ok(data: unknown) {
  return NextResponse.json({ ok: true, data });
}
function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/**
 * GET /api/admin/settings — List all settings or filter by category
 * ?category=general|shipping|payment|notifications|seo
 */
export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const admin = createService();
  if (!admin) return bad("Database not configured", 503);

  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const key = url.searchParams.get("key");

  let q = admin.from("settings").select("*");
  if (category) q = q.eq("category", category);
  if (key) q = q.eq("key", key);
  q = q.order("key", { ascending: true });

  const { data, error } = await q;
  if (error) return bad(error.message, 500);
  return ok(data);
}

/**
 * POST /api/admin/settings — Set one or more settings
 * Body: { key: string, value: any, category?: string, description?: string }
 * OR Body: { settings: Array<{ key, value, category?, description? }> } for batch
 */
export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const admin = createService();
  if (!admin) return bad("Database not configured", 503);

  let body: any;
  try { body = await req.json(); } catch { return bad("Invalid JSON"); }

  // Batch mode
  if (Array.isArray(body?.settings)) {
    const rows = body.settings.map((s: any) => ({
      key: s.key,
      value: typeof s.value === "object" ? s.value : { value: s.value },
      category: s.category ?? "general",
      description: s.description ?? null,
    }));

    const { data, error } = await admin
      .from("settings")
      .upsert(rows as never, { onConflict: "key" })
      .select();

    if (error) return bad(error.message, 500);
    return ok(data);
  }

  // Single setting
  if (!body?.key) return bad("Missing required field: key");

  const payload = {
    key: body.key,
    value: typeof body.value === "object" ? body.value : { value: body.value },
    category: body.category ?? "general",
    description: body.description ?? null,
  };

  const { data, error } = await admin
    .from("settings")
    .upsert(payload as never, { onConflict: "key" })
    .select()
    .single();

  if (error) return bad(error.message, 500);
  return ok(data);
}

/** DELETE /api/admin/settings?key=<key> — Delete a setting */
export async function DELETE(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key) return bad("Missing required query parameter: key");

  const admin = createService();
  if (!admin) return bad("Database not configured", 503);

  const { error } = await admin.from("settings").delete().eq("key", key);
  if (error) return bad(error.message, 500);
  return ok({ deleted: true, key });
}
