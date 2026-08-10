export const dynamic = "force-dynamic";
import { type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { CollectionService } from "@/lib/services/collection-service";
import { ApiResponse, handleApiError } from "@/lib/api-response";
import { requireAdminAuth } from "@/lib/auth-guard";

const collectionService = new CollectionService();

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const data = await collectionService.getCollections();
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
    const { validateCollection } = await import("@/lib/validations/collection");
    const validation = validateCollection(body);
    
    if (!validation.success) {
      return ApiResponse.error("Validation failed", "VALIDATION_ERROR", 400, validation.error.flatten());
    }

    const validData = validation.data;

    if (body.id) {
      const updated = await collectionService.updateCollection(body.id, validData);
      revalidatePath('/', 'layout');
      return ApiResponse.success(updated);
    } else {
      const created = await collectionService.createCollection(validData);
      revalidatePath('/', 'layout');
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
    return ApiResponse.error("Missing collection ID", "BAD_REQUEST", 400);
  }

  try {
    await collectionService.deleteCollection(id);
    revalidatePath('/', 'layout');
    return ApiResponse.success({ deleted: true, id });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
