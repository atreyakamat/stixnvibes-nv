export const dynamic = "force-dynamic";
import { type NextRequest } from "next/server";
import { SettingsRepository } from "@/lib/repositories/settings-repository";
import { ApiResponse, handleApiError } from "@/lib/api-response";
import { requireAdminAuth } from "@/lib/auth-guard";

const settingsRepo = new SettingsRepository();

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const category = url.searchParams.get("category") || undefined;
  const key = url.searchParams.get("key") || undefined;

  try {
    if (key) {
      const val = await settingsRepo.get(key);
      return ApiResponse.success({ key, value: val });
    }
    const settings = await settingsRepo.list(category);
    return ApiResponse.success(settings);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  let body: { key?: string; value?: unknown; category?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return ApiResponse.error("Invalid JSON body", "BAD_REQUEST", 400);
  }

  const { key, value, category, description } = body;
  if (!key) {
    return ApiResponse.error("Missing required setting key", "BAD_REQUEST", 400);
  }

  try {
    const updated = await settingsRepo.set(key, value, category, description);
    return ApiResponse.success(updated);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key) {
    return ApiResponse.error("Missing setting key to delete", "BAD_REQUEST", 400);
  }

  try {
    await settingsRepo.delete(key);
    return ApiResponse.success({ deleted: true, key });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
