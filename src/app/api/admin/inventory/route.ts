export const dynamic = "force-dynamic";
import { type NextRequest } from "next/server";
import { InventoryService } from "@/lib/services/inventory-service";
import { ApiResponse, handleApiError } from "@/lib/api-response";
import { requireAdminAuth } from "@/lib/auth-guard";

const inventoryService = new InventoryService();

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const productId = url.searchParams.get("productId") || undefined;
  const limit = Number(url.searchParams.get("limit") ?? 100);

  try {
    const logs = await inventoryService.getLogs({ productId, limit });
    return ApiResponse.success({ logs });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  let body: { productId?: string; change?: number; reason?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return ApiResponse.error("Invalid JSON body", "BAD_REQUEST", 400);
  }

  const { productId, change, reason, notes } = body;
  if (!productId || typeof change !== "number" || !reason) {
    return ApiResponse.error("Missing required fields: productId, change, reason", "BAD_REQUEST", 400);
  }

  try {
    const result = await inventoryService.recordStockChange(productId, change, reason, notes);
    return ApiResponse.success({ updated: true, newStock: result.newStock, log: result.log });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
