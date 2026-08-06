export const dynamic = "force-dynamic";
import { type NextRequest } from "next/server";
import { SettingsRepository } from "@/lib/repositories/settings-repository";
import { ApiResponse, handleApiError } from "@/lib/api-response";
import { requireAdminAuth } from "@/lib/auth-guard";

const settingsRepo = new SettingsRepository();

const DEFAULT_THEME = {
  primary_color: "#FFB200",
  secondary_color: "#E5261F",
  accent_color: "#FF5A1F",
  mode: "dark",
  font_sans: "Inter",
  font_display: "Space Grotesk",
  border_radius: "0.75rem",
};

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const theme = await settingsRepo.get("theme_config");
    return ApiResponse.success(theme ?? DEFAULT_THEME);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  let body: { theme?: unknown };
  try {
    body = await req.json();
  } catch {
    return ApiResponse.error("Invalid JSON body", "BAD_REQUEST", 400);
  }

  const { theme } = body;
  if (!theme || typeof theme !== "object") {
    return ApiResponse.error("Missing required 'theme' object", "BAD_REQUEST", 400);
  }

  try {
    const updated = await settingsRepo.set("theme_config", theme, "branding", "Theme & branding configuration");
    return ApiResponse.success({ saved: true, data: updated.value });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
