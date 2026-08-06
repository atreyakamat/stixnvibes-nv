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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "image/avif",
]);

/**
 * POST /api/admin/media/upload — Upload file to Supabase Storage
 */
export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const admin = createService();
  if (!admin) return bad("Database service unconfigured or unavailable", 503);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return bad("Invalid form data. Use multipart/form-data.");
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return bad("Missing file upload. Attach a file under the 'file' field.");
  }

  const blob = file as File;

  if (blob.size > MAX_FILE_SIZE) {
    return bad(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
  }

  if (!ALLOWED_TYPES.has(blob.type)) {
    return bad(`Unsupported file type: ${blob.type}. Allowed: ${Array.from(ALLOWED_TYPES).join(", ")}`);
  }

  const folder = (formData.get("folder") as string) || "products";
  const ext = blob.name.split(".").pop() || "webp";
  const timestamp = Date.now();
  const safeName = blob.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .slice(0, 50);
  const storagePath = `${folder}/${timestamp}-${safeName}.${ext}`;

  const buffer = Buffer.from(await blob.arrayBuffer());
  const { data, error } = await admin.storage
    .from("stixnvibes")
    .upload(storagePath, buffer, {
      contentType: blob.type,
      upsert: false,
    });

  if (error) {
    console.error("[/api/admin/media POST]", error.message);
    if (isConnectionError(error.message)) {
      return bad(`Storage connection failed: ${error.message}`, 503);
    }
    return bad(`Upload failed: ${error.message}`, 500);
  }

  const { data: publicUrlData } = admin.storage
    .from("stixnvibes")
    .getPublicUrl(data.path);

  return ok({
    path: data.path,
    url: publicUrlData.publicUrl,
    size: blob.size,
    type: blob.type,
    name: blob.name,
  });
}

/**
 * GET /api/admin/media — List uploaded media files
 * ?folder=products|categories|collections
 */
export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const admin = createService();
  if (!admin) return bad("Database service unconfigured or unavailable", 503);

  const url = new URL(req.url);
  const folder = url.searchParams.get("folder") || "products";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);

  try {
    const { data, error } = await admin.storage
      .from("stixnvibes")
      .list(folder, {
        limit,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      console.error("[/api/admin/media GET]", error.message);
      if (isConnectionError(error.message)) {
        return bad(`Storage connection failed: ${error.message}`, 503);
      }
      return bad(error.message, 500);
    }

    const files = (data || []).map((f) => {
      const { data: urlData } = admin.storage
        .from("stixnvibes")
        .getPublicUrl(`${folder}/${f.name}`);
      return {
        ...f,
        url: urlData.publicUrl,
        folder,
      };
    });

    return ok(files);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/admin/media GET catch]", msg);
    if (isConnectionError(msg)) {
      return bad(`Storage connection error: ${msg}`, 503);
    }
    return bad(msg, 500);
  }
}

/**
 * DELETE /api/admin/media?path=<storage_path> — Delete a media file
 */
export async function DELETE(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  if (!path) return bad("Missing required query parameter: path");

  const admin = createService();
  if (!admin) return bad("Database service unconfigured or unavailable", 503);

  try {
    const { error } = await admin.storage.from("stixnvibes").remove([path]);
    if (error) {
      if (isConnectionError(error.message)) {
        return bad(`Storage connection failed: ${error.message}`, 503);
      }
      return bad(error.message, 500);
    }
    return ok({ deleted: true, path });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isConnectionError(msg)) {
      return bad(`Storage connection error: ${msg}`, 503);
    }
    return bad(msg, 500);
  }
}
