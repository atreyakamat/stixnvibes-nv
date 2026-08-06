export const dynamic = "force-dynamic";
import { type NextRequest } from "next/server";
import { SettingsRepository } from "@/lib/repositories/settings-repository";
import { ApiResponse, handleApiError } from "@/lib/api-response";
import { requireAdminAuth } from "@/lib/auth-guard";

const settingsRepo = new SettingsRepository();

const DEFAULT_SECTIONS = [
  { id: "hero", name: "Hero Banner", enabled: true, sort_order: 1, headline: "Stick Loud. Vibe Harder.", subheadline: "Premium stickers, posters, Spotify cards & frames." },
  { id: "categories", name: "Featured Categories", enabled: true, sort_order: 2 },
  { id: "bestsellers", name: "Best Sellers", enabled: true, sort_order: 3 },
  { id: "new_arrivals", name: "New Arrivals", enabled: true, sort_order: 4 },
  { id: "customize", name: "Live Customizer Showcase", enabled: true, sort_order: 5 },
  { id: "collections", name: "Trending Collections", enabled: true, sort_order: 6 },
  { id: "why_us", name: "Why Choose Us", enabled: true, sort_order: 7 },
  { id: "reviews", name: "Customer Reviews", enabled: true, sort_order: 8 },
  { id: "instagram", name: "Instagram Feed", enabled: true, sort_order: 9 },
  { id: "newsletter", name: "Newsletter Signup", enabled: true, sort_order: 10 },
];

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const layout = await settingsRepo.get("homepage_layout");
    return ApiResponse.success(layout ?? DEFAULT_SECTIONS);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  let body: { sections?: unknown };
  try {
    body = await req.json();
  } catch {
    return ApiResponse.error("Invalid JSON body", "BAD_REQUEST", 400);
  }

  const { sections } = body;
  if (!Array.isArray(sections)) {
    return ApiResponse.error("Missing required 'sections' array", "BAD_REQUEST", 400);
  }

  try {
    const updated = await settingsRepo.set("homepage_layout", sections, "cms", "Homepage sections layout configuration");
    return ApiResponse.success({ saved: true, data: updated.value });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
