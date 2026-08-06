export const dynamic = "force-dynamic";
import { type NextRequest } from "next/server";
import { PageService } from "@/lib/services/page-service";
import { ApiResponse, handleApiError } from "@/lib/api-response";
import { requireAdminAuth } from "@/lib/auth-guard";

const pageService = new PageService();

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");

  try {
    if (slug) {
      const page = await pageService.getPageBySlug(slug);
      if (!page) return ApiResponse.notFound("Page not found");
      return ApiResponse.success(page);
    }
    const pages = await pageService.getPages();
    return ApiResponse.success(pages);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return ApiResponse.error("Invalid JSON body", "BAD_REQUEST", 400);
  }

  try {
    if (body.id) {
      const updated = await pageService.updatePage(body.id, body);
      return ApiResponse.success(updated);
    } else {
      const created = await pageService.createPage(body);
      return ApiResponse.success(created, undefined, 201);
    }
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return ApiResponse.error("Missing page ID", "BAD_REQUEST", 400);
  }

  try {
    await pageService.deletePage(id);
    return ApiResponse.success({ deleted: true, id });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
