export const dynamic = "force-dynamic";
import { type NextRequest } from "next/server";
import { CategoryService } from "@/lib/services/category-service";
import { ApiResponse, handleApiError } from "@/lib/api-response";
import { requireAdminAuth } from "@/lib/auth-guard";

const categoryService = new CategoryService();

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const data = await categoryService.getCategoryTree();
    return ApiResponse.success(data);
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
      const updated = await categoryService.updateCategory(body.id, body);
      return ApiResponse.success(updated);
    } else {
      const created = await categoryService.createCategory(body);
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
    return ApiResponse.error("Missing category ID", "BAD_REQUEST", 400);
  }

  try {
    await categoryService.deleteCategory(id);
    return ApiResponse.success({ deleted: true, id });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
