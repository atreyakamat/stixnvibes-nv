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

/** GET /api/admin/pages — List all CMS pages */
export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const admin = createService();
  if (!admin) return bad("Database service unconfigured or unavailable", 503);

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");

  try {
    if (slug) {
      const { data, error } = await admin
        .from("pages")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) {
        console.error("[/api/admin/pages GET slug]", error.message);
        if (isConnectionError(error.message)) {
          return bad(`Database connection failed: ${error.message}`, 503);
        }
        return bad(error.message, 404);
      }
      return ok(data);
    }

    const { data, error } = await admin
      .from("pages")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[/api/admin/pages GET]", error.message);
      if (isConnectionError(error.message)) {
        return bad(`Database connection failed: ${error.message}`, 503);
      }
      return bad(error.message, 500);
    }
    return ok(data ?? []);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/admin/pages GET catch]", msg);
    if (isConnectionError(msg)) {
      return bad(`Database connection error: ${msg}`, 503);
    }
    return bad(msg, 500);
  }
}

/** POST /api/admin/pages — Create or update a CMS page */
export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const admin = createService();
  if (!admin) return bad("Database not configured", 503);

  let body: any;
  try { body = await req.json(); } catch { return bad("Invalid JSON"); }

  if (!body?.title) return bad("Missing required field: title");

  const slug = body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!z.slug(slug)) return bad("Invalid slug format");

  const payload = {
    ...(body.id ? { id: body.id } : {}),
    title: body.title,
    slug,
    content: body.content ?? [],
    is_published: body.is_published ?? false,
    seo_title: body.seo_title ?? null,
    seo_description: body.seo_description ?? null,
  };

  try {
    const { data, error } = await admin
      .from("pages")
      .upsert(payload as never)
      .select()
      .single();

    if (error) return bad(error.message, 500);
    return ok(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/admin/pages POST]", msg);
    return bad("Database connection failed", 503);
  }
}

/** DELETE /api/admin/pages?id=<uuid> — Delete a page */
export async function DELETE(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return bad("Missing required query parameter: id");

  const admin = createService();
  if (!admin) return bad("Database not configured", 503);

  try {
    const { error } = await admin.from("pages").delete().eq("id", id);
    if (error) return bad(error.message, 500);
    return ok({ deleted: true, id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/admin/pages DELETE]", msg);
    return bad("Database connection failed", 503);
  }
}
