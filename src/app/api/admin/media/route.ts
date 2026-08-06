export const dynamic = "force-dynamic";
import { type NextRequest } from "next/server";
import { MediaService } from "@/lib/services/media-service";
import { ApiResponse, handleApiError } from "@/lib/api-response";
import { requireAdminAuth } from "@/lib/auth-guard";
import { createService } from "@/lib/supabase/service";

const mediaService = new MediaService();
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "image/avif",
]);

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const files = await mediaService.getMediaFiles();
    return ApiResponse.success(files);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const admin = createService();
  if (!admin) return ApiResponse.unavailable("Storage service unconfigured or unavailable");

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return ApiResponse.error("Invalid form data. Use multipart/form-data.", "BAD_REQUEST", 400);
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return ApiResponse.error("Missing file upload. Attach a file under the 'file' field.", "BAD_REQUEST", 400);
  }

  const blob = file as File;

  if (blob.size > MAX_FILE_SIZE) {
    return ApiResponse.error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`, "BAD_REQUEST", 400);
  }

  if (!ALLOWED_TYPES.has(blob.type)) {
    return ApiResponse.error(`Unsupported file type: ${blob.type}. Allowed: ${Array.from(ALLOWED_TYPES).join(", ")}`, "BAD_REQUEST", 400);
  }

  try {
    const ext = blob.name.split(".").pop() || "png";
    const filename = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const buffer = Buffer.from(await blob.arrayBuffer());
    const { data: uploadData, error: uploadErr } = await admin.storage
      .from("media")
      .upload(filename, buffer, {
        contentType: blob.type,
        upsert: true,
      });

    if (uploadErr) throw uploadErr;

    const { data: publicUrlData } = admin.storage.from("media").getPublicUrl(uploadData.path);
    return ApiResponse.success({
      url: publicUrlData.publicUrl,
      path: uploadData.path,
      name: blob.name,
      size: blob.size,
      type: blob.type,
    }, undefined, 201);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  if (!path) {
    return ApiResponse.error("Missing required query parameter: path", "BAD_REQUEST", 400);
  }

  try {
    await mediaService.deleteMediaFile(path);
    return ApiResponse.success({ deleted: true, path });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
