export const dynamic = "force-dynamic";
import { type NextRequest } from "next/server";
import { SettingsRepository } from "@/lib/repositories/settings-repository";
import { ApiResponse, handleApiError } from "@/lib/api-response";
import { requireAdminAuth } from "@/lib/auth-guard";

const settingsRepo = new SettingsRepository();

const DEFAULT_NAVIGATION = [
  { id: "nav_1", label: "Shop All", href: "/shop", visible: true, is_external: false, sort_order: 1 },
  { id: "nav_2", label: "Customizer", href: "/customize", visible: true, is_external: false, sort_order: 2 },
  { id: "nav_3", label: "About Us", href: "/about", visible: true, is_external: false, sort_order: 3 },
  { id: "nav_4", label: "Contact", href: "/contact", visible: true, is_external: false, sort_order: 4 },
  { id: "nav_5", label: "FAQ", href: "/faq", visible: true, is_external: false, sort_order: 5 },
];

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const nav = await settingsRepo.get("navigation_config");
    return ApiResponse.success(nav ?? DEFAULT_NAVIGATION);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  let body: { navigation?: unknown };
  try {
    body = await req.json();
  } catch {
    return ApiResponse.error("Invalid JSON body", "BAD_REQUEST", 400);
  }

  const { navigation } = body;
  if (!Array.isArray(navigation)) {
    return ApiResponse.error("Missing required 'navigation' array", "BAD_REQUEST", 400);
  }

  try {
    const updated = await settingsRepo.set("navigation_config", navigation, "cms", "Navigation items configuration");
    return ApiResponse.success({ saved: true, data: updated.value });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
