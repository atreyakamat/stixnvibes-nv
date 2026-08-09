export const dynamic = "force-dynamic";
import { type NextRequest } from "next/server";
import { ProductService } from "@/lib/services/product-service";
import { ApiResponse, handleApiError } from "@/lib/api-response";
import { requireAdminAuth } from "@/lib/auth-guard";
import { createService } from "@/lib/supabase/service";

const productService = new ProductService();

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const search = url.searchParams.get("search") || undefined;
  const limit = Number(url.searchParams.get("limit") ?? 200);

  try {
    const { data, total } = await productService.getProducts({
      type,
      status,
      search,
      limit,
    });
    return ApiResponse.success(data, { total });
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

  const admin = createService();

  // Handle Bulk Operations
  if (body?.bulkAction && Array.isArray(body?.ids)) {
    const { bulkAction, ids, status } = body;
    if (!admin) return ApiResponse.unavailable();

    try {
      if (bulkAction === "delete") {
        const { error } = await admin.from("products").delete().in("id", ids);
        if (error) throw error;
        return ApiResponse.success({ deleted: true, count: ids.length });
      }

      if (bulkAction === "status" && status) {
        const { error } = await admin
          .from("products")
          .update({ status })
          .in("id", ids);
        if (error) throw error;
        return ApiResponse.success({ updated: true, count: ids.length, status });
      }

      return ApiResponse.error("Unknown bulk action", "BAD_REQUEST", 400);
    } catch (err: unknown) {
      return handleApiError(err);
    }
  }

  // Handle Single Product Create or Update
  try {
    const { validateProduct } = await import("@/lib/validations/product");
    
    // Format incoming data to map correctly to schema
    const dataToValidate = {
      ...body,
      price_cents: Number(body.price_cents || 0),
      compare_at_cents: body.compare_at_cents ? Number(body.compare_at_cents) : undefined,
      stock: Number(body.stock || 0),
    };
    
    const validation = validateProduct(dataToValidate);
    if (!validation.success) {
      return ApiResponse.error("Validation failed", "VALIDATION_ERROR", 400, validation.error.flatten());
    }

    const validData = validation.data;

    if (body.id) {
      const updated = await productService.updateProduct(body.id, validData);
      return ApiResponse.success(updated);
    } else {
      const created = await productService.createProduct(validData);
      return ApiResponse.success(created, undefined, 201);
    }
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
